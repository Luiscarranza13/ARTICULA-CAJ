import { useStore } from '../store/useStore';

export default function LuisPage() {
  const { luisMode, toggleLuisMode } = useStore();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: luisMode
          ? 'linear-gradient(135deg, #7f1d1d 0%, #1c1917 100%)'
          : 'linear-gradient(135deg, #022c22 0%, #047857 100%)',
        fontFamily: 'Inter, system-ui, sans-serif',
        transition: 'background 0.6s ease',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${luisMode ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '24px',
          padding: '3rem 2.5rem',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Status icon */}
        <div
          style={{
            fontSize: '4rem',
            marginBottom: '1.5rem',
            lineHeight: 1,
          }}
        >
          {luisMode ? '💀' : '🕊️'}
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: luisMode ? '#fca5a5' : '#6ee7b7',
            marginBottom: '0.75rem',
            letterSpacing: '-0.02em',
          }}
        >
          {luisMode ? 'MODO CASTIGO ACTIVO' : 'Panel de Control'}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '0.95rem',
            color: luisMode ? '#fca5a580' : 'rgba(255,255,255,0.5)',
            marginBottom: '0.5rem',
            lineHeight: 1.6,
          }}
        >
          {luisMode
            ? 'La web está sufriendo las consecuencias de sus actos.'
            : 'Todo en paz. La web funciona con normalidad.'}
        </p>

        <p
          style={{
            fontSize: '0.8rem',
            color: 'rgba(255,255,255,0.25)',
            marginBottom: '2.5rem',
          }}
        >
          {luisMode
            ? 'Cuando lo perdones, presiona el botón de abajo.'
            : 'Si Luis la caga, ya sabes qué hacer.'}
        </p>

        {/* Status badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 1rem',
            borderRadius: '999px',
            background: luisMode ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
            border: `1px solid ${luisMode ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`,
            marginBottom: '2rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: luisMode ? '#fca5a5' : '#6ee7b7',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: luisMode ? '#ef4444' : '#10b981',
              display: 'inline-block',
              animation: 'pulse 2s infinite',
            }}
          />
          {luisMode ? 'Web destruida' : 'Web funcionando'}
        </div>

        {/* The big button */}
        <button
          type="button"
          onClick={toggleLuisMode}
          style={{
            display: 'block',
            width: '100%',
            padding: '1rem 2rem',
            borderRadius: '16px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            transition: 'all 0.2s ease',
            background: luisMode
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : 'linear-gradient(135deg, #ef4444, #b91c1c)',
            color: '#fff',
            boxShadow: luisMode
              ? '0 4px 24px rgba(16,185,129,0.4)'
              : '0 4px 24px rgba(239,68,68,0.5)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
          }}
        >
          {luisMode ? '🕊️ Perdonar a Luis (restaurar todo)' : '💀 Malograr la web de Luis'}
        </button>

        <p
          style={{
            marginTop: '1.5rem',
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.15)',
          }}
        >
          /luis · solo tú sabes que esto existe
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
