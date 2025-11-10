"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function RonyxDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function getProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/ronyx/login');
        return;
      }

      setUser(session.user);
      setLoading(false);
    }

    getProfile();
  }, [router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/ronyx/login');
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #000000 70%, #F7931E 100%)',
        color: 'white'
      }}>
        <div>Loading Ronyx Fleet Portal...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #000000 70%, #F7931E 100%)',
      color: 'white',
      fontFamily: 'Poppins, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        background: 'rgba(0, 0, 0, 0.9)',
        padding: '1rem 2rem',
        borderBottom: '2px solid #F7931E',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/ronyx_logo.png" alt="Ronyx Logo" style={{ height: '60px', marginRight: '1rem' }} />
          <div>
            <h1 style={{ margin: 0, color: '#F7931E', fontSize: '1.8rem' }}>Ronyx Fleet Portal</h1>
            <p style={{ margin: 0, color: '#ccc', fontSize: '0.9rem' }}>Powered by Move Around TMS™</p>
          </div>
        </div>
        <button 
          onClick={signOut}
          style={{
            background: '#F7931E',
            color: 'black',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Sign Out
        </button>
      </header>

      {/* Main Content */}
      <main style={{ padding: '2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            background: 'rgba(0, 0, 0, 0.8)',
            padding: '2rem',
            borderRadius: '15px',
            boxShadow: '0 0 25px rgba(247, 147, 30, 0.3)',
            marginBottom: '2rem'
          }}>
            <h2 style={{ color: '#F7931E', marginBottom: '1rem' }}>
              Welcome to Ronyx Fleet Portal
            </h2>
            <p style={{ color: '#ccc', marginBottom: '1.5rem' }}>
              Manage your fleet operations with professional tools and insights.
            </p>
            
            {user && (
              <div style={{ color: '#fff', marginBottom: '1rem' }}>
                <strong>Logged in as:</strong> {user.email}
              </div>
            )}
          </div>

          {/* Dashboard Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            {/* Fleet Overview */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.8)',
              padding: '1.5rem',
              borderRadius: '10px',
              border: '1px solid #F7931E'
            }}>
              <h3 style={{ color: '#F7931E', marginBottom: '1rem' }}>Fleet Overview</h3>
              <div style={{ color: '#ccc' }}>
                <p>• Active Vehicles: 12</p>
                <p>• Available Drivers: 8</p>
                <p>• Current Routes: 5</p>
                <p>• Maintenance Due: 2</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.8)',
              padding: '1.5rem',
              borderRadius: '10px',
              border: '1px solid #F7931E'
            }}>
              <h3 style={{ color: '#F7931E', marginBottom: '1rem' }}>Recent Activity</h3>
              <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                <p>• Route #1234 completed</p>
                <p>• Driver John D. checked in</p>
                <p>• Vehicle maintenance scheduled</p>
                <p>• New load assignment ready</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.8)',
              padding: '1.5rem',
              borderRadius: '10px',
              border: '1px solid #F7931E'
            }}>
              <h3 style={{ color: '#F7931E', marginBottom: '1rem' }}>Quick Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button style={{
                  background: '#F7931E',
                  color: 'black',
                  border: 'none',
                  padding: '0.5rem',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}>
                  Create New Route
                </button>
                <button style={{
                  background: 'transparent',
                  color: '#F7931E',
                  border: '1px solid #F7931E',
                  padding: '0.5rem',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}>
                  View Reports
                </button>
                <button style={{
                  background: 'transparent',
                  color: '#F7931E',
                  border: '1px solid #F7931E',
                  padding: '0.5rem',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}>
                  Manage Drivers
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        background: 'rgba(0, 0, 0, 0.9)',
        padding: '1rem',
        textAlign: 'center',
        borderTop: '1px solid #F7931E',
        marginTop: '3rem'
      }}>
        <p style={{ margin: 0, color: '#ccc' }}>
          Ronyx Fleet Management Portal • Powered by Move Around TMS™
        </p>
      </footer>
    </div>
  );
}