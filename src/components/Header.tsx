import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  User, Plus, Menu, X, Bell, LogOut
} from 'lucide-react';
import { auth, checkSupabaseConnection, supabase, admin } from '../lib/supabase';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingListingsCount, setPendingListingsCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    initializeAuth();
  }, [navigate, location.pathname]);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      
      // Check Supabase connection
      const connected = await checkSupabaseConnection();
      setIsConnected(connected);

      if (!connected) {
        console.warn('⚠️ Supabase connection failed');
        setIsLoading(false);
        return;
      }

      // Check current auth state
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser) {
        console.log('👤 Found authenticated user:', currentUser.email);
        
        // Verificăm dacă utilizatorul este admin
        const isAdminUser = await admin.isAdmin();
        setIsAdmin(isAdminUser);
        
        // Get user profile from database
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', currentUser.id)
          .single();
        
        if (!profileError && profileData) {
          console.log('✅ Profile found:', profileData.name);
          
          const userData = {
            id: currentUser.id,
            name: profileData.name,
            email: profileData.email,
            sellerType: profileData.seller_type,
            isAdmin: profileData.is_admin || currentUser.email === 'admin@nexar.ro',
            isLoggedIn: true
          };
          
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          
          // Dacă utilizatorul este admin, obținem numărul de anunțuri în așteptare
          if (userData.isAdmin) {
            loadPendingListingsCount();
          }
        } else {
          console.warn('⚠️ Profile not found for authenticated user');
          
          // Creăm automat profilul lipsă
          try {
            const { data: newProfile } = await supabase
              .from('profiles')
              .insert([{
                user_id: currentUser.id,
                name: currentUser.email?.split('@')[0] || 'Utilizator',
                email: currentUser.email,
                seller_type: 'individual',
                is_admin: currentUser.email === 'admin@nexar.ro'
              }])
              .select()
              .single();
              
            if (newProfile) {
              const userData = {
                id: currentUser.id,
                name: newProfile.name,
                email: newProfile.email,
                sellerType: newProfile.seller_type,
                isAdmin: newProfile.is_admin || currentUser.email === 'admin@nexar.ro',
                isLoggedIn: true
              };
              
              setUser(userData);
              localStorage.setItem('user', JSON.stringify(userData));
              
              // Dacă utilizatorul este admin, obținem numărul de anunțuri în așteptare
              if (userData.isAdmin) {
                loadPendingListingsCount();
              }
            } else {
              setUser({ 
                id: currentUser.id, 
                email: currentUser.email,
                isLoggedIn: true 
              });
            }
          } catch (profileCreateError) {
            console.error('❌ Error creating profile:', profileCreateError);
            setUser({ 
              id: currentUser.id, 
              email: currentUser.email,
              isLoggedIn: true 
            });
          }
        }
      } else {
        console.log('👤 No authenticated user');
        setUser(null);
        localStorage.removeItem('user');
      }
    } catch (error) {
      console.error('💥 Error checking auth state:', error);
      setUser(null);
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session?.user) {
        // Verificăm dacă utilizatorul este admin
        const isAdminUser = await admin.isAdmin();
        setIsAdmin(isAdminUser);
        
        // User signed in - get profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        if (!profileError && profileData) {
          const userData = {
            id: session.user.id,
            name: profileData.name,
            email: profileData.email,
            sellerType: profileData.seller_type,
            isAdmin: profileData.is_admin || session.user.email === 'admin@nexar.ro',
            isLoggedIn: true
          };
          
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          
          // Dacă utilizatorul este admin, obținem numărul de anunțuri în așteptare
          if (userData.isAdmin) {
            loadPendingListingsCount();
          }
          
          // Redirect to home page after successful login
          if (location.pathname === '/auth') {
            navigate('/');
          }
        } else {
          // Creăm automat profilul lipsă
          try {
            const { data: newProfile } = await supabase
              .from('profiles')
              .insert([{
                user_id: session.user.id,
                name: session.user.email?.split('@')[0] || 'Utilizator',
                email: session.user.email,
                seller_type: 'individual',
                is_admin: session.user.email === 'admin@nexar.ro'
              }])
              .select()
              .single();
              
            if (newProfile) {
              const userData = {
                id: session.user.id,
                name: newProfile.name,
                email: newProfile.email,
                sellerType: newProfile.seller_type,
                isAdmin: newProfile.is_admin || session.user.email === 'admin@nexar.ro',
                isLoggedIn: true
              };
              
              setUser(userData);
              localStorage.setItem('user', JSON.stringify(userData));
              
              // Dacă utilizatorul este admin, obținem numărul de anunțuri în așteptare
              if (userData.isAdmin) {
                loadPendingListingsCount();
              }
              
              // Redirect to home page after successful login
              if (location.pathname === '/auth') {
                navigate('/');
              }
            } else {
              setUser({ 
                id: session.user.id, 
                email: session.user.email,
                isLoggedIn: true 
              });
            }
          } catch (profileCreateError) {
            console.error('❌ Error creating profile:', profileCreateError);
            setUser({ 
              id: session.user.id, 
              email: session.user.email,
              isLoggedIn: true 
            });
          }
        }
        setIsLoading(false);
      } else if (event === 'SIGNED_OUT') {
        // User signed out
        setUser(null);
        setIsAdmin(false);
        setPendingListingsCount(0);
        localStorage.removeItem('user');
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  };

  // Funcție pentru a obține numărul de anunțuri în așteptare
  const loadPendingListingsCount = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('count', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      if (error) {
        console.error('Error fetching pending listings count:', error);
        return;
      }
      
      if (data) {
        setPendingListingsCount(data);
      }
    } catch (err) {
      console.error('Error in loadPendingListingsCount:', err);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Logging out user...');
      
      // Ștergem datele din localStorage ÎNAINTE de a face signOut
      localStorage.removeItem('user');
      
      // Deconectăm utilizatorul
      const { error } = await auth.signOut();
      
      if (error) {
        console.error('❌ Error during logout:', error);
        alert(`Eroare la deconectare: ${error.message}`);
      } else {
        console.log('✅ User logged out successfully');
        // Setăm starea utilizatorului la null
        setUser(null);
        setIsAdmin(false);
        setPendingListingsCount(0);
        // Închidem meniul utilizatorului
        setIsUserMenuOpen(false);
        // Redirecționăm către pagina principală
        navigate('/');
      }
    } catch (err) {
      console.error('💥 Unexpected error during logout:', err);
      alert('A apărut o eroare la deconectare. Te rugăm să încerci din nou.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderUserButton = () => {
    if (isLoading) {
      return (
        <div className="w-7 h-7 bg-gray-200 rounded-full animate-pulse"></div>
      );
    }

    if (user) {
      return (
        <button
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-nexar-accent rounded-full flex items-center justify-center text-white font-semibold text-xs">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden xl:inline">
              Bună, {user.name || 'Utilizator'}
            </span>
          </div>
        </button>
      );
    }

    return (
      <button
        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <User className="h-5 w-5 text-gray-700" />
      </button>
    );
  };

  return (
    <header className="bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center group min-w-0" onClick={() => {
            // Resetează toate filtrele și starea aplicației
            window.scrollTo(0, 0);
            // Reîncarcă pagina pentru a reseta toate filtrele
            if (location.pathname === '/anunturi') {
              window.location.href = '/anunturi';
            }
          }}>
            <img 
              src="/Nexar - logo_black & red.png" 
              alt="Nexar" 
              className="h-20 sm:h-24 w-auto transition-transform group-hover:scale-105 flex-shrink-0"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                if (target.src.includes('Nexar - logo_black & red.png')) {
                  target.src = '/nexar-logo.jpg';
                } else if (target.src.includes('nexar-logo.jpg')) {
                  target.src = '/nexar-logo.png';
                } else if (target.src.includes('nexar-logo.png')) {
                  target.src = '/image.png';
                } else {
                  target.style.display = 'none';
                  const textLogo = target.nextElementSibling as HTMLElement;
                  if (textLogo) {
                    textLogo.style.display = 'block';
                  }
                }
              }}
            />
            <div className="hidden text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-nexar-accent">
              NEXAR
            </div>
          </Link>

          {/* Navigation - Desktop */}
          <nav className="hidden lg:flex items-center space-x-1">
            <Link
              to="/anunturi"
              className={`px-3 xl:px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                isActive('/anunturi')
                  ? 'bg-nexar-accent text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Anunțuri
            </Link>
            <Link
              to="/adauga-anunt"
              className="flex items-center space-x-2 bg-nexar-accent text-white px-3 xl:px-4 py-2 rounded-lg font-medium hover:bg-nexar-gold transition-all duration-200 text-sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden xl:inline">Adaugă Anunț</span>
              <span className="xl:hidden">Adaugă</span>
            </Link>
            
            {/* User Menu */}
            <div className="relative">
              {renderUserButton()}
              
              {isUserMenuOpen && !isLoading && (
                <div className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 py-2 animate-scale-in">
                  {user ? (
                    <>
                      <Link
                        to="/profil"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        Profilul Meu
                      </Link>
                      <Link
                        to="/notificari"
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Bell className="h-4 w-4" />
                        <span>Notificări</span>
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <span>Admin Panel</span>
                          {pendingListingsCount > 0 && (
                            <span className="bg-nexar-accent text-white text-xs font-bold px-2 py-1 rounded-full">
                              {pendingListingsCount}
                            </span>
                          )}
                        </Link>
                      )}
                      <hr className="my-2" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        disabled={isLoading}
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Deconectează-te</span>
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/auth"
                      className="block px-4 py-2 text-sm text-gray-900 font-medium hover:bg-gray-50 transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Conectează-te
                    </Link>
                  )}
                </div>
              )}
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-gray-200 animate-slide-up bg-white/95 backdrop-blur-md">
            <div className="space-y-2">
              <Link
                to="/anunturi"
                className="block px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Anunțuri
              </Link>
              <Link
                to="/adauga-anunt"
                className="flex items-center space-x-2 px-4 py-3 bg-nexar-accent text-white rounded-lg font-medium mx-0"
                onClick={() => setIsMenuOpen(false)}
              >
                <Plus className="h-4 w-4" />
                <span>Adaugă Anunț</span>
              </Link>
              
              {isLoading ? (
                <div className="px-4 py-3 text-gray-700 font-medium border-t border-gray-200 mt-2 pt-4">
                  Se încarcă...
                </div>
              ) : user ? (
                <>
                  <div className="px-4 py-3 text-gray-700 font-medium border-t border-gray-200 mt-2 pt-4">
                    Bună, {user.name || 'Utilizator'}
                  </div>
                  <Link
                    to="/profil"
                    className="block px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profilul Meu
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="flex items-center justify-between px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span>Admin Panel</span>
                      {pendingListingsCount > 0 && (
                        <span className="bg-nexar-accent text-white text-xs font-bold px-2 py-1 rounded-full">
                          {pendingListingsCount}
                        </span>
                      )}
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center space-x-2 w-full text-left px-4 py-3 rounded-lg font-medium text-red-600 hover:bg-red-50 transition-colors"
                    disabled={isLoading}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Deconectează-te</span>
                  </button>
                </>
              ) : (
                <Link
                  to="/auth"
                  className="block px-4 py-3 rounded-lg font-medium text-gray-900 hover:bg-gray-100 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Conectează-te
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;