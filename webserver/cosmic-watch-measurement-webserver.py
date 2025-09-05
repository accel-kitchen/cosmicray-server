import serial
import serial.tools.list_ports
import datetime
from time import sleep
import os
import requests
import json
import threading
import time
from collections import deque

def search_com_port():
    coms = serial.tools.list_ports.comports()
    comlist = []
    for com in coms:
        comlist.append(com.device)
    print('Connected COM ports: ' + str(comlist))
    return comlist

def select_com_port(comlist):
    if len(comlist) == 1:
        print('connected to '+comlist[0])
        return comlist[0]
    elif len(comlist) > 1:
        print('select from available ports:')
        i = 0
        for com in comlist:
            print(str(i) + ': ' + com)
            i += 1
        use_port_num = input()
        print('connected to '+comlist[int(use_port_num)])
        return comlist[int(use_port_num)]
    else:
        print("detector is not detected.")
        sleep(10)

def authenticate_user(server_url):
    """ユーザー認証"""
    max_attempts = 3
    
    for attempt in range(max_attempts):
        print(f"\n=== Authentication (Attempt {attempt + 1}/{max_attempts}) ===")
        user_id = input("Enter your User ID: ")
        password = input("Enter your Password: ")
        
        try:
            response = requests.post(
                f"{server_url}/auth/login",
                json={'id': user_id, 'password': password},
                timeout=10
            )
            
            if response.status_code == 200:
                auth_data = response.json()
                print(f"✓ Authentication successful! Welcome, {user_id}")
                return {
                    'user_id': user_id,
                    'token': auth_data['token'],
                    'role': auth_data['user']['role']
                }
            else:
                error_msg = response.json().get('error', 'Unknown error')
                print(f"✗ Authentication failed: {error_msg}")
                
        except requests.exceptions.RequestException as e:
            print(f"✗ Network error: {e}")
    
    print("\nAuthentication failed. Exiting.")
    exit(1)

def load_or_create_config(auth_info):
    config_file = 'config.json'
    
    if os.path.exists(config_file):
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            # 設定ファイルのIDと認証されたIDが一致するかチェック
            if config.get('id') == auth_info['user_id']:
                print(f"Loaded existing config for ID: {config['id']}")
                return config
            else:
                print(f"Config ID mismatch. Creating new config for {auth_info['user_id']}")
        except (json.JSONDecodeError, KeyError):
            print("Invalid config file. Creating new one.")
    
    # Create new config
    print("\n=== Cosmic Watch Measurement Setup ===")
    print(f"User ID: {auth_info['user_id']} (authenticated)")
    comment = input("Enter measurement comment: ")
    gps_lat = input("Enter GPS latitude (optional): ")
    gps_lon = input("Enter GPS longitude (optional): ")
    
    config = {
        'id': auth_info['user_id'],
        'comment': comment,
        'gps_latitude': gps_lat if gps_lat else None,
        'gps_longitude': gps_lon if gps_lon else None,
        'created_at': datetime.datetime.now().isoformat(),
        'auth_token': auth_info['token']
    }
    
    # Save config locally
    with open(config_file, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    
    print(f"Config saved for ID: {auth_info['user_id']}")
    return config

def setup_id_on_server(config, server_url, auth_token):
    headers = {'Authorization': f'Bearer {auth_token}'}
    
    try:
        response = requests.post(
            f"{server_url}/setup-id",
            json=config,
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Server setup complete: {result['message']}")
            return True
        else:
            error_msg = response.json().get('error', f'HTTP {response.status_code}')
            print(f"✗ Server setup failed: {error_msg}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"✗ Server setup error: {e}")
        return False

class DataUploader:
    def __init__(self, measurement_id, server_url, auth_token, upload_interval=60):
        self.measurement_id = measurement_id
        self.server_url = server_url
        self.auth_token = auth_token
        self.upload_interval = upload_interval
        self.data_buffer = deque()
        self.failed_data = deque()
        self.buffer_lock = threading.Lock()
        self.upload_thread = None
        self.stop_event = threading.Event()
        self.stats = {'sent': 0, 'failed': 0, 'buffered': 0}
        self.headers = {'Authorization': f'Bearer {auth_token}'}
        
    def add_data(self, event, date, time, adc, sipm, deadtime, temp):
        """測定データをバッファに追加（非ブロッキング）"""
        data = {
            'event': event,
            'date': date,
            'time': time,
            'adc': adc,
            'sipm': sipm,
            'deadtime': deadtime,
            'temp': temp
        }
        
        with self.buffer_lock:
            self.data_buffer.append(data)
            self.stats['buffered'] += 1
            
    def start_uploader(self):
        """アップローダースレッド開始"""
        self.upload_thread = threading.Thread(target=self._upload_loop, daemon=True)
        self.upload_thread.start()
        print(f"Data uploader started (interval: {self.upload_interval}s)")
        
    def stop_uploader(self):
        """アップローダー停止"""
        self.stop_event.set()
        if self.upload_thread:
            self.upload_thread.join(timeout=5)
        # 残りデータを最後に送信
        self._upload_batch(final=True)
        
    def _upload_loop(self):
        """定期アップロードループ"""
        while not self.stop_event.wait(self.upload_interval):
            self._upload_batch()
            
    def _upload_batch(self, final=False):
        """バッファ内データを一括送信"""
        with self.buffer_lock:
            if not self.data_buffer and not self.failed_data:
                return
                
            # 失敗データを優先的に再送信
            batch_data = list(self.failed_data) + list(self.data_buffer)
            if not final:
                # 通常時は一部を残してバッファサイズを制御
                batch_size = min(len(batch_data), 100)
                batch_data = batch_data[:batch_size]
                
            self.failed_data.clear()
            self.data_buffer.clear()
            
        if not batch_data:
            return
            
        print(f"Uploading {len(batch_data)} data points...")
        success_count = 0
        
        for data in batch_data:
            if self._upload_single_data(data):
                success_count += 1
                self.stats['sent'] += 1
            else:
                with self.buffer_lock:
                    self.failed_data.append(data)
                self.stats['failed'] += 1
                
        print(f"Upload completed: {success_count}/{len(batch_data)} successful")
        print(f"Stats - Sent: {self.stats['sent']}, Failed: {self.stats['failed']}, Buffered: {len(self.data_buffer)}")
        
    def _upload_single_data(self, data, max_retries=3):
        """単一データをリトライ付きで送信"""
        for attempt in range(max_retries):
            try:
                response = requests.post(
                    f"{self.server_url}/upload-data/{self.measurement_id}",
                    json=data,
                    headers=self.headers,
                    timeout=3
                )
                if response.status_code == 200:
                    return True
                elif response.status_code == 401 or response.status_code == 403:
                    print(f"Authentication error (attempt {attempt + 1}): HTTP {response.status_code}")
                    print("Token may have expired. Please restart the application.")
                    return False
                else:
                    print(f"Upload failed (attempt {attempt + 1}): HTTP {response.status_code}")
                    
            except requests.exceptions.RequestException as e:
                print(f"Network error (attempt {attempt + 1}): {e}")
                
            if attempt < max_retries - 1:
                sleep_time = 2 ** attempt  # 指数バックオフ: 1s, 2s, 4s
                time.sleep(sleep_time)
                
        return False

# サーバーURL設定
SERVER_URL = "http://accel-kitchen.com:3000"  # 本番サーバー用

# Authenticate user
auth_info = authenticate_user(SERVER_URL)

# Load configuration
config = load_or_create_config(auth_info)
measurement_id = config['id']
auth_token = config.get('auth_token', auth_info['token'])

# Setup ID on server
print("Setting up measurement ID on server...")
if not setup_id_on_server(config, SERVER_URL, auth_token):
    print("Warning: Server setup failed, but continuing with local backup...")

# Initialize data uploader
uploader = DataUploader(measurement_id, SERVER_URL, auth_token, upload_interval=60)
uploader.start_uploader()

# ready serial com.
comlist = search_com_port()
use_port = select_com_port(comlist)
ser = serial.Serial(use_port, 9600)

# prepare plotting
data = {
    'time': [],
    'adc': [],
    'vol': [],
    'deadtime': []
}

# time start
start_time = datetime.datetime.now()

# prepare local backup directory
local_data_dir = f'./data/{measurement_id}'
try:
    os.makedirs(local_data_dir, exist_ok=True)
except OSError as e:
    print(f"Error creating directory: {e}")
    exit(1)

print(f"Starting measurement... Uploading to {SERVER_URL}")
print("Press Ctrl+C to stop")

# read lines
event_counter = 0
try:
    while True:
        day = datetime.datetime.now()
        f = open(os.path.join(local_data_dir, day.strftime('%Y-%m-%d')+'.dat'), 'a')
        try:
            line = ser.readline().decode('utf-8').split()
        except UnicodeDecodeError:
            continue
        
        if (len(line) > 2 and line[0] != '###'):
            event_counter += 1
            date = day.strftime('%Y-%m-%d-%H-%M-%S.%f')
            time = int(day.timestamp() * 1000000)  # マイクロ秒単位のタイムスタンプ
            
            # 新しい形式でデータを準備
            adc = line[0]
            sipm = line[2] if len(line) > 2 else '0'
            deadtime = line[3] if len(line) > 3 else '0'
            temp = line[4] if len(line) > 4 else '25.0'  # デフォルト温度
            
            # 新しい形式でローカルファイルに保存
            data_line = f"{event_counter}\t{date}\t{time}\t{adc}\t{sipm}\t{deadtime}\t{temp}"
            print(data_line)
            
            # ローカルバックアップ
            f.write(data_line + '\n')
            f.close()
            
            # サーバーにアップロード（バッファに追加）
            uploader.add_data(event_counter, date, time, adc, sipm, deadtime, temp)
            
except KeyboardInterrupt:
    print("\nStopping measurement...")
    uploader.stop_uploader()
    ser.close()
    print("Measurement stopped.")
    exit()