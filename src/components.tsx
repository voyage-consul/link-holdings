import React from 'react';
import {
  Users, UserCheck, UserMinus, BarChart2, PieChart, TrendingUp, TrendingDown,
  CheckCircle, XCircle, AlertCircle, Info, Table, Loader2, LayoutDashboard,
  ClipboardList, CalendarCheck, ChevronDown, LogOut, ChevronLeft, ChevronRight,
  RefreshCw, Edit3, Calendar, Filter
} from 'lucide-react';

export const IconComp = ({ name, size = 18, className = "" }: { name: string, size?: number, className?: string }) => {
  const m: Record<string, any> = {
    'users': Users, 'user-check': UserCheck, 'user-minus': UserMinus,
    'bar-chart-2': BarChart2, 'pie-chart': PieChart, 'trending-up': TrendingUp,
    'trending-down': TrendingDown, 'check-circle': CheckCircle, 'x-circle': XCircle,
    'alert-circle': AlertCircle, 'info': Info, 'table': Table, 'loader-2': Loader2,
    'layout-dashboard': LayoutDashboard, 'clipboard-list': ClipboardList,
    'calendar-check': CalendarCheck, 'chevron-down': ChevronDown, 'log-out': LogOut,
    'chevron-left': ChevronLeft, 'chevron-right': ChevronRight,
    'refresh-cw': RefreshCw, 'edit-3': Edit3, 'calendar': Calendar, 'filter': Filter
  };
  const I = m[name];
  return I ? <I size={size} className={className} /> : null;
};

export const InfoTooltip = ({ text }: { text: string }) => (
  <div className="relative group inline-flex items-center ml-1.5 z-[100]">
    <Info size={14} className="text-[#666] cursor-help hover:text-[#0067b8] transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-max max-w-[320px] bg-[#1a1a1a] text-white text-[12px] p-3 rounded-lg shadow-xl whitespace-pre-wrap leading-relaxed pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-[100]">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#1a1a1a]" />
    </div>
  </div>
);

export const KPICard = ({
  title, value, unit, icon, info, subText, change, changeLabel, editable, onValueChange
}: any) => (
  <div className="card p-5 card-hover flex flex-col justify-between min-h-[120px]">
    <div className="flex justify-between items-start mb-3">
      <div className="p-2 rounded-lg bg-[#f2f2f2]">
        <IconComp name={icon} size={20} className="text-[#0067b8]" />
      </div>
    </div>
    <div>
      <h3 className="text-[#666] text-[11px] font-semibold tracking-wide uppercase mb-1 flex items-center">
        {title}{info && <InfoTooltip text={info} />}
      </h3>
      <div className="flex items-baseline gap-1.5">
        {editable ? (
          <input
            type="number"
            value={value}
            onChange={(e) => onValueChange && onValueChange(Number(e.target.value))}
            className="text-[32px] font-bold text-[#000] tracking-tight leading-none bg-yellow-50 border border-yellow-300 rounded px-1 w-full max-w-[150px]"
          />
        ) : (
          <span className="text-[32px] font-bold text-[#000] tracking-tight leading-none">
            {typeof value === 'number' ? value.toLocaleString() : (value ?? 0)}
          </span>
        )}
        <span className="text-[#666] text-xs font-semibold">{unit}</span>
      </div>
      {change != null && !isNaN(change) && change !== Infinity && (
        <div className="flex items-center gap-1 mt-1.5">
          <IconComp name={change >= 0 ? 'trending-up' : 'trending-down'} size={12}
            className={change >= 0 ? 'text-[#0067b8]' : 'text-[#d13438]'} />
          <span className={`text-[11px] font-bold ${change >= 0 ? 'text-[#0067b8]' : 'text-[#d13438]'}`}>
            {change >= 0 ? '+' : ''}{change}%
          </span>
          {changeLabel && <span className="text-[10px] text-[#666] ml-0.5">{changeLabel}</span>}
        </div>
      )}
      {subText && <p className="text-[11px] text-[#666] mt-1">{subText}</p>}
    </div>
  </div>
);

export const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white p-4 rounded-lg shadow-xl border border-[#f2f2f2] text-xs z-[200]">
      <p className="font-semibold text-[#000] mb-2 text-sm">{label}</p>
      {payload.map((e: any, i: number) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
          <span className="text-[#666]">{e.name}:</span>
          <span className="font-bold text-[#000]">
            {e.value?.toLocaleString() || 0}
            {e.name.includes('率') ? '%' : ''}
          </span>
        </div>
      ))}
    </div>
  );
};

export const LoginScreen = ({ onLogin, config }: any) => {
  const loginRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const renderButton = () => {
      if ((window as any).google && loginRef.current) {
        (window as any).google.accounts.id.initialize({
          client_id: config.GOOGLE_CLIENT_ID,
          callback: (response: any) => {
            localStorage.setItem('google_id_token', response.credential);
            onLogin(response.credential);
          },
        });
        (window as any).google.accounts.id.renderButton(loginRef.current, {
          theme: 'outline', size: 'large', width: 300,
        });
      }
    };

    if ((window as any).google) {
      renderButton();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = renderButton;
    document.head.appendChild(script);
  }, [config.GOOGLE_CLIENT_ID, onLogin]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-[24px] font-semibold mb-8">{config.TITLE}</h1>
      <div ref={loginRef}></div>
    </div>
  );
};

