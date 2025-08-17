class AdminManager {
    constructor() {
        // 開発環境判定
        this.isLocalhost = window.location.hostname === 'localhost';
        this.apiBaseUrl = this.isLocalhost ? 'http://localhost:3000' : '';
        this.authToken = localStorage.getItem('admin_token');
        this.currentEditingUser = null;
        
        // GPS地図関連
        this.gpsMap = null;
        this.gpsMarker = null;
        this.mapVisible = false;
        
        // デモ用データ（本番環境でAPIが使用できない場合）
        this.mockUsers = [
            {
                id: 'root',
                role: 'admin',
                comment: 'Admin User',
                gps_latitude: '35.6762',
                gps_longitude: '139.6503',
                created_at: '2025-08-17T00:00:00.000Z',
                last_login: null
            },
            {
                id: 'test',
                role: 'user',
                comment: 'Test User',
                gps_latitude: '35.6762',
                gps_longitude: '139.6503',
                created_at: '2025-06-15T00:00:00.000Z',
                last_login: '2025-06-20T10:30:00.000Z'
            }
        ];
        
        this.initEventListeners();
        this.checkAuth();
    }
    
    initEventListeners() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });
        
        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });
        
        // Add user button
        document.getElementById('add-user-btn').addEventListener('click', () => {
            this.showAddUserModal();
        });
        
        // Save user button
        document.getElementById('save-user-btn').addEventListener('click', () => {
            this.saveUser();
        });
        
        // Confirm delete button
        document.getElementById('confirm-delete-btn').addEventListener('click', () => {
            this.confirmDelete();
        });
        
        // GPS map controls
        document.getElementById('toggle-map-btn').addEventListener('click', () => {
            this.toggleGpsMap();
        });
        
        document.getElementById('clear-gps-btn').addEventListener('click', () => {
            this.clearGpsCoordinates();
        });
        
        document.getElementById('current-location-btn').addEventListener('click', () => {
            this.getCurrentLocation();
        });
        
        // GPS input field listeners for real-time map update
        document.getElementById('user-gps-lat').addEventListener('input', () => {
            this.updateMapFromInputs();
        });
        
        document.getElementById('user-gps-lon').addEventListener('input', () => {
            this.updateMapFromInputs();
        });
    }
    
    checkAuth() {
        if (this.authToken) {
            this.validateToken();
        } else {
            this.showLoginScreen();
        }
    }
    
    async validateToken() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/validate`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.user.role === 'admin') {
                    this.showAdminDashboard();
                } else {
                    this.showError('Admin access required');
                    this.logout();
                }
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Token validation error:', error);
            this.logout();
        }
    }
    
    async login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        
        // 実際のAPI認証
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: username,
                    password: password
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.user.role === 'admin') {
                this.authToken = data.token;
                localStorage.setItem('admin_token', this.authToken);
                this.showAdminDashboard();
                this.hideLoginError();
            } else {
                this.showLoginError(data.error || 'Admin access required');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showLoginError('Network error. Please try again.');
        }
    }
    
    logout() {
        this.authToken = null;
        localStorage.removeItem('admin_token');
        this.showLoginScreen();
    }
    
    showLoginScreen() {
        document.getElementById('login-screen').style.display = 'block';
        document.getElementById('admin-dashboard').style.display = 'none';
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        this.hideLoginError();
    }
    
    showAdminDashboard() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        this.loadUsers();
    }
    
    showLoginError(message) {
        const errorDiv = document.getElementById('login-error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
    
    hideLoginError() {
        document.getElementById('login-error').style.display = 'none';
    }
    
    async loadUsers() {
        const loadingDiv = document.getElementById('users-loading');
        const tableContainer = document.getElementById('users-table-container');
        
        loadingDiv.style.display = 'block';
        tableContainer.style.display = 'none';
        
        
        // 実際のAPIを使用
        try {
            const response = await fetch(`${this.apiBaseUrl}/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.displayUsers(data.users);
                loadingDiv.style.display = 'none';
                tableContainer.style.display = 'block';
            } else {
                this.showError('Failed to load users');
            }
        } catch (error) {
            console.error('Load users error:', error);
            this.showError('Network error loading users');
        }
    }
    
    displayUsers(users) {
        const tbody = document.getElementById('users-table-body');
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>
                    <strong>${user.id}</strong>
                    ${user.role === 'admin' ? '<span class="badge bg-warning ms-2">Admin</span>' : ''}
                </td>
                <td>${user.comment || '-'}</td>
                <td>
                    ${user.gps_latitude && user.gps_longitude ? 
                        `📍 ${parseFloat(user.gps_latitude).toFixed(4)}, ${parseFloat(user.gps_longitude).toFixed(4)}` : 
                        '-'}
                </td>
                <td>
                    <span class="badge ${user.role === 'admin' ? 'bg-warning' : 'bg-secondary'}">${user.role}</span>
                </td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>${user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="admin.editUser('${user.id}')">
                        ✏️ Edit
                    </button>
                    ${user.id !== 'root' ? 
                        `<button class="btn btn-sm btn-danger" onclick="admin.deleteUser('${user.id}')">
                            🗑️ Delete
                        </button>` : 
                        '<span class="text-muted">Protected</span>'}
                </td>
            </tr>
        `).join('');
    }
    
    showAddUserModal() {
        this.currentEditingUser = null;
        document.getElementById('userModalTitle').textContent = 'Add User';
        document.getElementById('user-id').disabled = false;
        document.getElementById('user-password').required = true;
        
        // Clear form
        document.getElementById('user-form').reset();
        
        // Reset GPS map state
        this.resetGpsMapState();
        
        const modal = new bootstrap.Modal(document.getElementById('userModal'));
        modal.show();
    }
    
    async editUser(userId) {
        try {
            // Get current user data
            const response = await fetch(`${this.apiBaseUrl}/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const user = data.users.find(u => u.id === userId);
                
                if (user) {
                    this.currentEditingUser = userId;
                    document.getElementById('userModalTitle').textContent = 'Edit User';
                    document.getElementById('user-id').disabled = true;
                    document.getElementById('user-password').required = false;
                    
                    // Fill form with current data
                    document.getElementById('user-id').value = user.id;
                    document.getElementById('user-password').value = '';
                    document.getElementById('user-comment').value = user.comment || '';
                    document.getElementById('user-gps-lat').value = user.gps_latitude || '';
                    document.getElementById('user-gps-lon').value = user.gps_longitude || '';
                    
                    // Reset GPS map state
                    this.resetGpsMapState();
                    
                    const modal = new bootstrap.Modal(document.getElementById('userModal'));
                    modal.show();
                }
            }
        } catch (error) {
            console.error('Edit user error:', error);
            this.showError('Failed to load user data');
        }
    }
    
    async saveUser() {
        const id = document.getElementById('user-id').value;
        const password = document.getElementById('user-password').value;
        const comment = document.getElementById('user-comment').value;
        const gpsLat = document.getElementById('user-gps-lat').value;
        const gpsLon = document.getElementById('user-gps-lon').value;
        
        if (!id) {
            this.showError('User ID is required');
            return;
        }
        
        if (!this.currentEditingUser && !password) {
            this.showError('Password is required for new users');
            return;
        }
        
        const userData = {
            comment: comment,
            gps_latitude: gpsLat || null,
            gps_longitude: gpsLon || null
        };
        
        if (password) {
            userData.password = password;
        }
        
        try {
            let response;
            
            if (this.currentEditingUser) {
                // Edit existing user
                response = await fetch(`${this.apiBaseUrl}/admin/users/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.authToken}`
                    },
                    body: JSON.stringify(userData)
                });
            } else {
                // Create new user
                userData.id = id;
                userData.password = password;
                
                response = await fetch(`${this.apiBaseUrl}/admin/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.authToken}`
                    },
                    body: JSON.stringify(userData)
                });
            }
            
            const data = await response.json();
            
            if (response.ok) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('userModal'));
                modal.hide();
                this.loadUsers();
                this.showSuccess(data.message);
            } else {
                this.showError(data.error || 'Failed to save user');
            }
        } catch (error) {
            console.error('Save user error:', error);
            this.showError('Network error saving user');
        }
    }
    
    deleteUser(userId) {
        document.getElementById('delete-user-id').textContent = userId;
        const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
        modal.show();
        
        // Store the user ID for deletion
        this.userToDelete = userId;
    }
    
    async confirmDelete() {
        if (!this.userToDelete) return;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/admin/users/${this.userToDelete}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
                modal.hide();
                this.loadUsers();
                this.showSuccess(data.message);
            } else {
                this.showError(data.error || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Delete user error:', error);
            this.showError('Network error deleting user');
        }
        
        this.userToDelete = null;
    }
    
    showError(message) {
        // Create temporary alert
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('.container');
        container.insertBefore(alert, container.firstChild);
        
        // Auto dismiss after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }
    
    showSuccess(message) {
        // Create temporary alert
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('.container');
        container.insertBefore(alert, container.firstChild);
        
        // Auto dismiss after 3 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 3000);
    }
    
    // GPS Map Functions
    
    toggleGpsMap() {
        const container = document.getElementById('user-gps-map-container');
        const btn = document.getElementById('toggle-map-btn');
        
        if (this.mapVisible) {
            container.style.display = 'none';
            btn.innerHTML = '📍 Select on Map';
            this.mapVisible = false;
        } else {
            container.style.display = 'block';
            btn.innerHTML = '🗺️ Hide Map';
            this.mapVisible = true;
            
            // Initialize map if not already done
            if (!this.gpsMap) {
                this.initGpsMap();
            } else {
                // Refresh map size after showing
                setTimeout(() => {
                    this.gpsMap.invalidateSize();
                }, 100);
            }
        }
    }
    
    initGpsMap() {
        const mapElement = document.getElementById('user-gps-map');
        if (!mapElement) return;
        
        // Default center (Japan)
        let defaultLat = 35.6762;
        let defaultLng = 139.6503;
        
        // Use current GPS values if available
        const latInput = document.getElementById('user-gps-lat');
        const lngInput = document.getElementById('user-gps-lon');
        
        if (latInput.value && lngInput.value) {
            defaultLat = parseFloat(latInput.value);
            defaultLng = parseFloat(lngInput.value);
        }
        
        // Initialize map
        this.gpsMap = L.map(mapElement).setView([defaultLat, defaultLng], 10);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(this.gpsMap);
        
        // Add marker if coordinates exist
        if (latInput.value && lngInput.value) {
            this.gpsMarker = L.marker([defaultLat, defaultLng]).addTo(this.gpsMap);
        }
        
        // Map click event
        this.gpsMap.on('click', (e) => {
            this.onMapClick(e);
        });
    }
    
    onMapClick(e) {
        const lat = e.latlng.lat.toFixed(6);
        const lng = e.latlng.lng.toFixed(6);
        
        // Update input fields
        document.getElementById('user-gps-lat').value = lat;
        document.getElementById('user-gps-lon').value = lng;
        
        // Update marker
        if (this.gpsMarker) {
            this.gpsMarker.setLatLng(e.latlng);
        } else {
            this.gpsMarker = L.marker(e.latlng).addTo(this.gpsMap);
        }
        
        // Add popup with coordinates
        this.gpsMarker.bindPopup(`
            <div>
                <strong>Selected Location</strong><br>
                Lat: ${lat}<br>
                Lng: ${lng}
            </div>
        `).openPopup();
    }
    
    updateMapFromInputs() {
        if (!this.gpsMap) return;
        
        const latInput = document.getElementById('user-gps-lat');
        const lngInput = document.getElementById('user-gps-lon');
        
        const lat = parseFloat(latInput.value);
        const lng = parseFloat(lngInput.value);
        
        if (isNaN(lat) || isNaN(lng)) {
            // Remove marker if coordinates are invalid
            if (this.gpsMarker) {
                this.gpsMap.removeLayer(this.gpsMarker);
                this.gpsMarker = null;
            }
            return;
        }
        
        // Update map center and marker
        this.gpsMap.setView([lat, lng], this.gpsMap.getZoom());
        
        if (this.gpsMarker) {
            this.gpsMarker.setLatLng([lat, lng]);
        } else {
            this.gpsMarker = L.marker([lat, lng]).addTo(this.gpsMap);
        }
    }
    
    clearGpsCoordinates() {
        document.getElementById('user-gps-lat').value = '';
        document.getElementById('user-gps-lon').value = '';
        
        if (this.gpsMarker) {
            this.gpsMap.removeLayer(this.gpsMarker);
            this.gpsMarker = null;
        }
    }
    
    getCurrentLocation() {
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by this browser');
            return;
        }
        
        const btn = document.getElementById('current-location-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '🔄 Getting Location...';
        btn.disabled = true;
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude.toFixed(6);
                const lng = position.coords.longitude.toFixed(6);
                
                document.getElementById('user-gps-lat').value = lat;
                document.getElementById('user-gps-lon').value = lng;
                
                // Update map if visible
                if (this.gpsMap) {
                    this.gpsMap.setView([lat, lng], 15);
                    
                    if (this.gpsMarker) {
                        this.gpsMarker.setLatLng([lat, lng]);
                    } else {
                        this.gpsMarker = L.marker([lat, lng]).addTo(this.gpsMap);
                    }
                    
                    this.gpsMarker.bindPopup(`
                        <div>
                            <strong>Current Location</strong><br>
                            Lat: ${lat}<br>
                            Lng: ${lng}
                        </div>
                    `).openPopup();
                }
                
                btn.innerHTML = originalText;
                btn.disabled = false;
                this.showSuccess('Current location acquired');
            },
            (error) => {
                console.error('Geolocation error:', error);
                btn.innerHTML = originalText;
                btn.disabled = false;
                
                let errorMessage = 'Unable to get current location';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access denied by user';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timeout';
                        break;
                }
                this.showError(errorMessage);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }
    
    resetGpsMapState() {
        // Hide map
        const container = document.getElementById('user-gps-map-container');
        const btn = document.getElementById('toggle-map-btn');
        
        container.style.display = 'none';
        btn.innerHTML = '📍 Select on Map';
        this.mapVisible = false;
        
        // Destroy existing map
        if (this.gpsMap) {
            this.gpsMap.remove();
            this.gpsMap = null;
            this.gpsMarker = null;
        }
    }
}

// Initialize admin manager when page loads
const admin = new AdminManager();