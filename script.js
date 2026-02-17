/**
 * FaceDahou - JavaScript
 * شبكة الطلبة الجزائريين
 * فكرة وتصميم: دحو أسامة
 */

// ===========================
// Supabase Configuration
// ===========================
const SUPABASE_URL = 'https://jwjmdqbuuoheukqlvqzl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3am1kcWJ1dW9oZXVrcWx2cXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTc0NDEsImV4cCI6MjA4NjkzMzQ0MX0.7Fk80O6O-Vxs-A4YAUpPCd7XYuwwITK1gm5c40NF6hw';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

// ===========================
// Authentication Functions
// ===========================

/**
 * Check Authentication State
 */
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        await loadUserProfile();
        showMainApp();
    } else {
        showAuthModal();
    }
}

/**
 * Handle Login
 */
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        alert('خطأ: ' + error.message);
    } else {
        currentUser = data.user;
        await loadUserProfile();
        showMainApp();
    }
}

/**
 * Handle Signup
 */
async function handleSignup(event) {
    event.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const name = document.getElementById('signupName').value;
    const university = document.getElementById('signupUniversity').value;
    const major = document.getElementById('signupMajor').value;
    const year = document.getElementById('signupYear').value;

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name,
                university: university,
                major: major,
                year: year
            }
        }
    });

    if (error) {
        alert('خطأ: ' + error.message);
    } else {
        // Create user profile in database
        await createUserProfile(data.user, name, university, major, year);
        alert('تم إنشاء الحساب بنجاح! يرجى تسجيل الدخول.');
        showLogin();
    }
}

/**
 * Create User Profile in Database
 */
async function createUserProfile(user, name, university, major, year) {
    const { error } = await supabase
        .from('profiles')
        .insert([
            {
                id: user.id,
                full_name: name,
                university: university,
                major: major,
                year: year,
                avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4267B2&color=fff&size=200`
            }
        ]);

    if (error) console.error('Error creating profile:', error);
}

/**
 * Load User Profile
 */
async function loadUserProfile() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

    if (data) {
        const avatarUrl = data.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.full_name)}&background=4267B2&color=fff&size=40`;
        document.getElementById('userAvatar').src = avatarUrl;
        document.getElementById('createPostAvatar').src = avatarUrl.replace('size=40', 'size=45');
    }
}

/**
 * Login with Google OAuth
 */
async function loginWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin
        }
    });

    if (error) alert('خطأ: ' + error.message);
}

/**
 * Logout
 */
async function logout() {
    await supabase.auth.signOut();
    location.reload();
}

// ===========================
// UI Functions
// ===========================

/**
 * Show Auth Modal
 */
function showAuthModal() {
    document.getElementById('authModal').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
}

/**
 * Show Main App
 */
function showMainApp() {
    document.getElementById('authModal').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    loadPosts();
}

/**
 * Show Login Form
 */
function showLogin() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('signupForm').classList.add('hidden');
}

/**
 * Show Signup Form
 */
function showSignup() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('signupForm').classList.remove('hidden');
}

// ===========================
// File Upload Functions
// ===========================

/**
 * Upload Photo
 */
function uploadPhoto() {
    document.getElementById('fileInput').accept = 'image/*';
    document.getElementById('fileInput').click();
}

/**
 * Upload Video
 */
function uploadVideo() {
    document.getElementById('fileInput').accept = 'video/*';
    document.getElementById('fileInput').click();
}

/**
 * Upload PDF File
 */
function uploadFile() {
    document.getElementById('fileInput').accept = '.pdf';
    document.getElementById('fileInput').click();
}

/**
 * Handle File Upload
 */
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `posts/${currentUser.id}/${fileName}`;

    const { data, error } = await supabase.storage
        .from('media')
        .upload(filePath, file);

    if (error) {
        alert('خطأ في رفع الملف: ' + error.message);
    } else {
        const content = document.getElementById('postContent').value || 'تم مشاركة ملف جديد';
        await createPost(content, filePath, file.type);
        document.getElementById('postContent').value = '';
        event.target.value = '';
    }
}

// ===========================
// Post Functions
// ===========================

/**
 * Create New Post
 */
async function createPost(content, mediaPath = null, mediaType = null) {
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

    const { error } = await supabase
        .from('posts')
        .insert([
            {
                user_id: currentUser.id,
                content: content,
                media_path: mediaPath,
                media_type: mediaType,
                author_name: profile.full_name,
                author_avatar: profile.avatar_url,
                university: profile.university
            }
        ]);

    if (error) {
        alert('خطأ في إنشاء المنشور: ' + error.message);
    } else {
        loadPosts();
    }
}

/**
 * Load Posts
 */
async function loadPosts() {
    const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error loading posts:', error);
        return;
    }

    const postsContainer = document.getElementById('postsContainer');
    postsContainer.innerHTML = '';

    if (posts.length === 0) {
        postsContainer.innerHTML = `
            <div class="post-card">
                <p style="text-align: center; color: #65676b; padding: 20px;">
                    لا توجد منشورات بعد. كن أول من يشارك!
                </p>
            </div>
        `;
        return;
    }

    posts.forEach(post => {
        const postElement = createPostElement(post);
        postsContainer.appendChild(postElement);
    });
}

/**
 * Create Post Element
 */
function createPostElement(post) {
    const div = document.createElement('div');
    div.className = 'post-card';
    
    const timeAgo = getTimeAgo(new Date(post.created_at));
    
    let mediaHTML = '';
    if (post.media_path) {
        const { data: { publicUrl } } = supabase.storage
            .from('media')
            .getPublicUrl(post.media_path);
        
        if (post.media_type?.startsWith('image/')) {
            mediaHTML = `<div class="post-media"><img src="${publicUrl}" alt="صورة المنشور"></div>`;
        } else if (post.media_type?.startsWith('video/')) {
            mediaHTML = `<div class="post-media"><video controls style="width: 100%;"><source src="${publicUrl}" type="${post.media_type}"></video></div>`;
        } else if (post.media_type === 'application/pdf') {
            mediaHTML = `<div class="post-media" style="padding: 20px; background: #f0f2f5; text-align: center;">
                <i class="fas fa-file-pdf" style="font-size: 48px; color: #f7b928;"></i>
                <p style="margin-top: 10px;"><a href="${publicUrl}" target="_blank" style="color: #4267B2; font-weight: 600;">عرض ملف PDF</a></p>
            </div>`;
        }
    }
    
    div.innerHTML = `
        <div class="post-header">
            <div class="post-user">
                <img src="${post.author_avatar || 'https://ui-avatars.com/api/?name=User&background=4267B2&color=fff&size=45'}" alt="${post.author_name}">
                <div class="post-user-info">
                    <h4>${post.author_name} <span class="badge">${post.university || 'طالب'}</span></h4>
                    <p>${timeAgo}</p>
                </div>
            </div>
            <button class="post-options"><i class="fas fa-ellipsis-h"></i></button>
        </div>
        <div class="post-content">${post.content}</div>
        ${mediaHTML}
        <div class="post-stats">
            <span><i class="fas fa-thumbs-up" style="color: #4267B2;"></i> ${post.likes || 0}</span>
            <span>${post.comments || 0} تعليق • ${post.shares || 0} مشاركة</span>
        </div>
        <div class="post-actions">
            <button class="post-action" onclick="likePost('${post.id}')">
                <i class="far fa-thumbs-up"></i> إعجاب
            </button>
            <button class="post-action">
                <i class="far fa-comment"></i> تعليق
            </button>
            <button class="post-action">
                <i class="far fa-share-square"></i> مشاركة
            </button>
        </div>
    `;
    
    return div;
}

/**
 * Like Post
 */
async function likePost(postId) {
    const { data: post } = await supabase
        .from('posts')
        .select('likes')
        .eq('id', postId)
        .single();

    const { error } = await supabase
        .from('posts')
        .update({ likes: (post.likes || 0) + 1 })
        .eq('id', postId);

    if (!error) loadPosts();
}

// ===========================
// Helper Functions
// ===========================

/**
 * Get Time Ago String
 */
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'الآن';
    if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
    if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
    if (seconds < 604800) return `منذ ${Math.floor(seconds / 86400)} يوم`;
    return date.toLocaleDateString('ar-DZ');
}

/**
 * Show Create Post (Focus on Input)
 */
function showCreatePost() {
    document.getElementById('postContent').focus();
}

/**
 * Show Notifications (Coming Soon)
 */
function showNotifications() {
    alert('قريباً: نظام الإشعارات');
}

/**
 * Show Messages (Coming Soon)
 */
function showMessages() {
    alert('قريباً: نظام المحادثات');
}

/**
 * Show Profile (Coming Soon)
 */
function showProfile() {
    alert('قريباً: صفحة الملف الشخصي');
}

// ===========================
// Search Functionality
// ===========================

/**
 * Initialize Search
 */
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', async (e) => {
            const searchTerm = e.target.value.toLowerCase();
            
            if (searchTerm.length < 2) {
                loadPosts();
                return;
            }

            const { data: posts } = await supabase
                .from('posts')
                .select('*')
                .or(`content.ilike.%${searchTerm}%,author_name.ilike.%${searchTerm}%`)
                .order('created_at', { ascending: false });

            const postsContainer = document.getElementById('postsContainer');
            postsContainer.innerHTML = '';
            
            if (posts && posts.length > 0) {
                posts.forEach(post => {
                    const postElement = createPostElement(post);
                    postsContainer.appendChild(postElement);
                });
            } else {
                postsContainer.innerHTML = `
                    <div class="post-card">
                        <p style="text-align: center; color: #65676b; padding: 20px;">
                            لا توجد نتائج للبحث
                        </p>
                    </div>
                `;
            }
        });
    }
}

// ===========================
// Real-time Updates
// ===========================

/**
 * Subscribe to Real-time Post Updates
 */
function subscribeToUpdates() {
    supabase
        .channel('public:posts')
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'posts' }, 
            payload => {
                console.log('New post:', payload);
                loadPosts(); // Reload posts when new post is added
            }
        )
        .subscribe();
}

// ===========================
// Initialize App
// ===========================

/**
 * Initialize Application
 */
async function initApp() {
    await checkAuth();
    initializeSearch();
    subscribeToUpdates();
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// ===========================
// Service Worker (Optional - for PWA)
// ===========================

/**
 * Register Service Worker for PWA capabilities
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Uncomment when you create a service worker file
        // navigator.serviceWorker.register('/sw.js');
    });
}
