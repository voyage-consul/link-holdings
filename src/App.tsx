import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Papa from 'papaparse';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import { getSheetId, parseDate, formatMonth, getWeekRange, formatDay, hasTag, isTrue } from './utils';
import { IconComp, InfoTooltip, KPICard, CustomTooltip, LoginScreen } from './components';
import { RefreshCw, Edit3, LogOut, Loader2, AlertCircle, Calendar, ChevronDown, Filter } from 'lucide-react';


// ============================================
// ===== 案件設定（ここだけ変更してください） =====
// ============================================
const CONFIG = {
  TITLE: 'LINKホールディングス LINEダッシュボード',
  CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS9a24oYfTg7TTOK8wt1WHyQ2yT_52Wpsvz1Jt-B-5fGnegGFGYUiDxzIGVZQ2BsvDSkgAiigOyhlgS/pub?gid=1046338902&single=true&output=csv',
  SHEET_URL: 'https://docs.google.com/spreadsheets/d/1tKBNV0VVCA4TH2p1fMOY_IZSppZ8bmE0OGzRBPa8xkU/edit?gid=1042566139#gid=1042566139',
  PROXY_URL: 'https://line-dashboard-proxy.raspy-wood-9b0d.workers.dev',
  GOOGLE_CLIENT_ID: '813216912152-hf6cden86ijta1qjc67uvscdlhmi85sl.apps.googleusercontent.com',
  SHEET_NAME: 'シナリオ別CSV',
};
// ============================================

const PIE_COLORS = ["#0067b8", "#107c10", "#00A4EF", "#ffb900", "#d13438", "#0078d4", "#881798", "#00b294", "#e3008c", "#ff8c00", "#00188f"];
const INFLOW_TAGS = ['広告_LINE', '広告_X', 'X_プロフィール', 'X_固定リンク', 'X_投稿', 'HP', 'MEO', '名刺', '訪問見積時', '紹介'];

const FUNNEL_STEPS = [
  { label: '登録直後', target: '訪問予約シナリオ_登録直後_対象者', tap: '訪問予約シナリオ_登録直後_タップ' },
  { label: '2通目(10分後)', target: '訪問予約シナリオ_2通目(10分後)_対象者', tap: '訪問予約シナリオ_2通目(10分後)_タップ' },
  { label: '3通目(1時間後)', target: '訪問予約シナリオ_3通目(1時間後)_対象者', tap: '訪問予約シナリオ_3通目(1時間後)_タップ' },
  { label: '4通目(1日後)', target: '訪問予約シナリオ_4通目(1日後8時)_対象者', tap: '訪問予約シナリオ_4通目(1日後8時)_タップ' },
  { label: '5通目(2日後)', target: '訪問予約シナリオ_5通目(2日後12時)_対象者', tap: '訪問予約シナリオ_5通目(2日後12時)_タップ' },
  { label: '6通目(3日後)', target: '訪問予約シナリオ_6通目(3日後20時)_対象者', tap: '訪問予約シナリオ_6通目(3日後20時)_タップ' },
  { label: '7通目(5日後)', target: '訪問予約シナリオ_7通目(5日後20時)_対象者', tap: '訪問予約シナリオ_7通目(5日後20時)_タップ' },
  { label: '8通目(7日後)', target: '訪問予約シナリオ_8通目(7日後19時)_対象者', tap: '訪問予約シナリオ_8通目(7日後19時)_タップ' }
];

const isDeployed = window.location.hostname.includes('github.io');

export default function App() {
  const [data, setData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDataDate, setLastDataDate] = useState<string>('-');
  const [authRequired, setAuthRequired] = useState(isDeployed);
  
  const [periodType, setPeriodType] = useState('月次');
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [selectedInflows, setSelectedInflows] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  
  const [tableMode, setTableMode] = useState<'period' | 'inflow'>('period');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isDeployed) {
        const token = localStorage.getItem('google_id_token');
        if (!token) {
          setAuthRequired(true);
          setLoading(false);
          return;
        }
        const res = await fetch(`${CONFIG.PROXY_URL}/sheets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ sheetId: getSheetId(CONFIG.SHEET_URL), sheetName: CONFIG.SHEET_NAME })
        });
        if (res.status === 401) {
          localStorage.removeItem('google_id_token');
          setAuthRequired(true);
          setLoading(false);
          return;
        }
        if (res.status === 403) throw new Error('アクセス権がありません。スプレッドシートの共有設定を管理者に確認してください。');
        const json = await res.json();
        if (!json.rows || !json.headers) throw new Error('データ形式エラー');
        const formatted = json.rows.map((row: any[]) => {
          const o: any = {};
          json.headers.forEach((h: string, i: number) => { o[h] = row[i] || ''; });
          return o;
        });
        setHeaders(json.headers);
        setData(formatted);
      } else {
        Papa.parse(CONFIG.CSV_URL, {
          download: true,
          header: true,
          skipEmptyLines: true,
          transformHeader: (h) => h.trim(),
          complete: (r) => {
            setHeaders(r.meta.fields || []);
            setData(r.data);
          },
          error: (e) => setError(e.message)
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  useEffect(() => {
    if (!authRequired) fetchData();
  }, [authRequired]);

  useEffect(() => {
    if (data.length > 0) {
      const dates = data.map(d => parseDate(d['友だち追加日時'])).filter(d => d !== null) as Date[];
      if (dates.length > 0) {
        dates.sort((a, b) => b.getTime() - a.getTime());
        setLastDataDate(formatDay(dates[0]) || '-');
      }
    }
  }, [data]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (editMode) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [editMode]);

  // Generate enriched data with computed fields
  const processedData = useMemo(() => {
    return data.map(row => {
      const date = parseDate(row['友だち追加日時']);
      const month = formatMonth(date);
      const week = getWeekRange(date);
      const day = formatDay(date);
      
      let trueInflow = '不明';
      for (const tag of INFLOW_TAGS) {
        if (isTrue(row[tag])) { trueInflow = tag; break; }
      }

      return { ...row, _date: date, _month: month, _week: week, _day: day, _inflow: trueInflow };
    });
  }, [data]);

  // Extract unique periods / inflows for filters
  const periodOptions = useMemo(() => {
    const key = periodType === '月次' ? '_month' : periodType === '週次' ? '_week' : '_day';
    const set = new Set(processedData.map(d => d[key]).filter(Boolean));
    return Array.from(set).sort((a: any, b: any) => a > b ? -1 : 1);
  }, [processedData, periodType]);

  const inflowOptions = useMemo(() => {
    const set = new Set(processedData.map(d => d._inflow).filter(i => i !== '不明'));
    return Array.from(set);
  }, [processedData]);

  // Set default selection when period type changes
  useEffect(() => {
    if (periodOptions.length > 0 && selectedPeriods.length === 0) {
      setSelectedPeriods([periodOptions[0]]);
    }
  }, [periodOptions]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return processedData.filter(row => {
      const pKey = periodType === '月次' ? '_month' : periodType === '週次' ? '_week' : '_day';
      const matchPeriod = selectedPeriods.includes('全期間') || selectedPeriods.includes(row[pKey]);
      const matchInflow = selectedInflows.length === 0 || selectedInflows.includes(row._inflow);
      return matchPeriod && matchInflow;
    });
  }, [processedData, periodType, selectedPeriods, selectedInflows]);

  // Data for previous period (for KPI comparison)
  const previousData = useMemo(() => {
    if (selectedPeriods.includes('全期間') || selectedPeriods.length !== 1) return [];
    const current = selectedPeriods[0];
    const idx = periodOptions.indexOf(current);
    if (idx === -1 || idx >= periodOptions.length - 1) return [];
    const prev = periodOptions[idx + 1];
    
    return processedData.filter(row => {
      const pKey = periodType === '月次' ? '_month' : periodType === '週次' ? '_week' : '_day';
      const matchInflow = selectedInflows.length === 0 || selectedInflows.includes(row._inflow);
      return row[pKey] === prev && matchInflow;
    });
  }, [processedData, periodType, selectedPeriods, selectedInflows, periodOptions]);

  // Helper for metrics computation
  const computeMetrics = (dataset: any[]) => {
    const total = dataset.length;
    const active = dataset.filter(r => !isTrue(r['ユーザーブロック'])).length;
    const blocks = total - active;
    const blockRate = total > 0 ? (blocks / total) * 100 : 0;
    
    // CV = 訪問予約済
    const cvs = dataset.filter(r => !isTrue(r['ユーザーブロック']) && isTrue(r['訪問予約済'])).length;
    const cvRate = active > 0 ? (cvs / active) * 100 : 0;

    // Push Target & Tap
    const pushTargets = dataset.filter(r => !isTrue(r['ユーザーブロック']) && !isTrue(r['訪問予約済'])).length;
    const pushTaps = dataset.filter(r => !isTrue(r['ユーザーブロック']) && !isTrue(r['訪問予約済']) && isTrue(r['訪問予約_タップ'])).length;
    const pushTapRate = pushTargets > 0 ? (pushTaps / pushTargets) * 100 : 0;
    
    // Cancellations
    const cancels = dataset.filter(r => !isTrue(r['ユーザーブロック']) && isTrue(r['訪問予約_キャンセル'])).length;
    const cancelRate = cvs > 0 ? (cancels / cvs) * 100 : 0;

    return { total, active, blocks, blockRate, cvs, cvRate, pushTargets, pushTaps, pushTapRate, cancels, cancelRate };
  };

  const calcDiff = (curr: number, prev: number) => {
    if (!prev) return null;
    return Number(((curr - prev) / prev * 100).toFixed(1));
  };
  const calcPointDiff = (curr: number, prev: number) => {
    if (!prev) return null;
    return Number((curr - prev).toFixed(1));
  };

  const currMetrics = computeMetrics(filteredData);
  const prevMetrics = computeMetrics(previousData);

  // editable state tracking
  const [customKPIs, setCustomKPIs] = useState<any>({});
  const getVal = (key: string, real: number) => editMode && customKPIs[key] !== undefined ? customKPIs[key] : real;
  const setVal = (key: string, val: number) => setCustomKPIs(local => ({...local, [key]: val}));

  if (authRequired) {
    return <LoginScreen config={CONFIG} onLogin={() => setAuthRequired(false)} />;
  }
  
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen space-y-4">
        <Loader2 className="animate-spin text-[#0067b8]" size={32} />
        <p className="text-[#666] font-semibold">データを読み込んでいます...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-8 text-red-600 bg-red-50 border border-red-200 rounded-lg m-8">
        <h3 className="font-bold mb-2 flex items-center"><IconComp name="alert-circle" className="mr-2"/> エラーが発生しました</h3>
        <p>{error}</p>
      </div>
    );
  }

  // Generate Matrix Table Data
  const generateGroupMatrix = (mode: 'period' | 'inflow') => {
    const groups: Record<string, any[]> = {};
    const key = mode === 'period' ? 
      (periodType === '月次' ? '_month' : periodType === '週次' ? '_week' : '_day') 
      : '_inflow';
    
    // Group records
    processedData.forEach(row => {
      const g = mode === 'inflow' ? (row._inflow === '不明' ? '不明' : row._inflow) : (row[key] || '不明');
      if (!groups[g]) groups[g] = [];
      groups[g].push(row);
    });

    const list = Object.keys(groups).map(g => {
      let active = groups[g].filter(r => !isTrue(r['ユーザーブロック'])).length;
      let totalCV = groups[g].filter(r => !isTrue(r['ユーザーブロック']) && isTrue(r['訪問予約済'])).length;
      const o: any = { name: g, active, cv: totalCV, cvRate: active > 0 ? (totalCV/active*100).toFixed(1) : '0.0' };
      
      FUNNEL_STEPS.forEach((step, i) => {
        let targets = groups[g].filter(r => !isTrue(r['ユーザーブロック']) && isTrue(r[step.target])).length;
        let taps = groups[g].filter(r => !isTrue(r['ユーザーブロック']) && isTrue(r[step.tap])).length;
        o[`s${i}_target`] = targets;
        o[`s${i}_tap`] = taps;
        o[`s${i}_rate`] = targets > 0 ? (taps/targets*100).toFixed(1) : '0.0';
      });
      return o;
    });

    if(mode === 'period') {
      list.sort((a,b) => a.name > b.name ? -1 : 1);
    } else {
      list.sort((a,b) => b.cv - a.cv);
    }
    return list;
  };
  const matrixData = generateGroupMatrix(tableMode);

  // Reusable Funnel Row Render
  const TableRow: React.FC<{ row: any, isTotal?: boolean }> = ({ row, isTotal = false }) => (
    <tr className={`border-b border-[#f2f2f2] ${isTotal ? 'bg-[#f2f2f2] font-semibold sticky top-0 z-10' : 'hover:bg-gray-50 bg-white'}`}>
      <td className={`p-2 min-w-[120px] sticky left-0 z-10 border-r-2 border-[#d2d2d2] ${isTotal ? 'bg-[#e2e2e2]' : 'bg-white font-medium'}`}>
        {row.name}
      </td>
      {FUNNEL_STEPS.map((_, i) => (
        <React.Fragment key={i}>
          <td className="p-2 text-right">{row[`s${i}_target`]}</td>
          <td className="p-2 text-right">{row[`s${i}_tap`]}</td>
          <td className={`p-2 text-right border-r-2 border-[#d2d2d2] ${Number(row[`s${i}_rate`]) > 20 ? 'text-[#0067b8] font-bold' : Number(row[`s${i}_rate`]) < 5 ? 'text-[#d13438]' : ''}`}>
            {row[`s${i}_rate`]}%
          </td>
        </React.Fragment>
      ))}
      <td className="p-2 text-right font-bold text-gray-500 bg-gray-50">{row.active}</td>
      <td className="p-2 text-right font-bold text-[#0067b8] bg-gray-50">{row.cv}</td>
      <td className="p-2 text-right font-bold text-[#107c10] bg-gray-50">{row.cvRate}%</td>
    </tr>
  );

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#000] font-['Noto_Sans_JP'] p-4 md:p-6 lg:p-8 animate-fadeIn mx-auto max-w-[1600px]">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 border-b border-[#f2f2f2] pb-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#000] tracking-tight">{CONFIG.TITLE}</h1>
          <div className="flex items-center gap-4 mt-2 text-[12px] text-[#666]">
            <span className="flex items-center gap-1.5"><RefreshCw size={14}/> 有効データ最終日: {lastDataDate}</span>
            {isDeployed && (
              <button onClick={() => { localStorage.removeItem('google_id_token'); window.location.reload(); }} className="flex items-center gap-1 hover:text-[#d13438] transition-colors">
                <LogOut size={14}/> ログアウト
              </button>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 border border-[#f2f2f2] rounded-lg shadow-sm">
          {editMode && <div className="text-[#d13438] text-[11px] font-bold uppercase flex items-center gap-1 mr-2"><AlertCircle size={14}/> 編集モードON: 変更は一時的です</div>}
          <button onClick={()=>setEditMode(!editMode)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold border ${editMode ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-[#666] border-[#d2d2d2] hover:bg-gray-50'}`}>
            <Edit3 size={14}/> {editMode ? '編集終了' : '編集'}
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-4 rounded-xl border border-[#f2f2f2] shadow-sm">
        <div className="flex border border-[#d2d2d2] rounded-md overflow-hidden bg-white">
          {['月次', '週次', '日次'].map(t => (
            <button key={t} onClick={() => { setPeriodType(t); setSelectedPeriods([]); }}
              className={`px-4 py-1.5 text-[13px] font-semibold border-r border-[#d2d2d2] last:border-0 ${periodType === t ? 'bg-[#0067b8] text-white' : 'text-[#666] hover:bg-gray-50'}`}>
              {t}
            </button>
          ))}
        </div>
        
        <div className="flex-1 flex flex-wrap gap-2 items-center">
          <div className="relative group/period z-50">
            <button className="btn-secondary flex items-center gap-2">
              <Calendar size={16}/> 期間選択 ({selectedPeriods.length > 0 ? selectedPeriods.length : '全'}) <ChevronDown size={14}/>
            </button>
            <div className="absolute top-full left-0 mt-1 hidden group-hover/period:flex flex-col bg-white border border-[#f2f2f2] rounded-lg shadow-xl p-3 w-64 max-h-64 overflow-y-auto">
              <label className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer border-b border-gray-100 mb-1">
                <input type="checkbox" checked={selectedPeriods.includes('全期間')} onChange={(e) => {
                  if(e.target.checked) setSelectedPeriods(['全期間']); else setSelectedPeriods([]);
                }}/>
                <span className="text-sm font-semibold">全期間</span>
              </label>
              {periodOptions.map(p => (
                <label key={p} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                  <input type="checkbox" checked={selectedPeriods.includes(p) && !selectedPeriods.includes('全期間')} 
                    onChange={(e) => {
                      let next = [...selectedPeriods].filter(x => x !== '全期間');
                      if (e.target.checked) next.push(p); else next = next.filter(x => x !== p);
                      setSelectedPeriods(next);
                  }}/>
                  <span className="text-sm text-gray-700">{p}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="relative group/inflow z-40">
            <button className="btn-secondary flex items-center gap-2">
              <Filter size={16}/> 経路 ({selectedInflows.length > 0 ? selectedInflows.length : '全'}) <ChevronDown size={14}/>
            </button>
            <div className="absolute top-full left-0 mt-1 hidden group-hover/inflow:flex flex-col bg-white border border-[#f2f2f2] rounded-lg shadow-xl p-3 w-64 max-h-64 overflow-y-auto">
              {inflowOptions.map(i => (
                <label key={i} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                  <input type="checkbox" checked={selectedInflows.includes(i)} onChange={(e) => {
                    if (e.target.checked) setSelectedInflows(ls => [...ls, i]);
                    else setSelectedInflows(ls => ls.filter(x => x !== i));
                  }}/>
                  <span className="text-sm text-gray-700">{i}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPI METRICS GRID */}
      <h2 className="text-[#000] font-semibold text-[18px] mb-4 flex items-center gap-2">主要指標 <span className="text-[12px] font-normal text-[#666] bg-gray-100 px-2 py-0.5 rounded-full">{periodType} ({selectedPeriods.join(', ')})</span></h2>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-10">
        <KPICard 
          title="総登録数 (ブロック含)" 
          value={getVal('total', currMetrics.total)} 
          unit="人" 
          icon="users" 
          change={calcDiff(currMetrics.total, prevMetrics.total)}
          changeLabel="前期間比"
          editable={editMode} onValueChange={(v:number) => setVal('total',v)}
          info="該当期間内に「友だち追加日時」が存在するユーザーの全件数"
        />
        <KPICard 
          title="アクティブ数" 
          value={getVal('active', currMetrics.active)} 
          unit="人" 
          icon="user-check" 
          change={calcDiff(currMetrics.active, prevMetrics.active)}
          editable={editMode} onValueChange={(v:number) => setVal('active',v)}
          info="総登録数から「ユーザーブロック」している人を引いた数"
        />
        <KPICard 
          title="訪問予約済 (CV)" 
          value={getVal('cvs', currMetrics.cvs)} 
          unit="件" 
          icon="check-circle" 
          change={calcDiff(currMetrics.cvs, prevMetrics.cvs)}
          editable={editMode} onValueChange={(v:number) => setVal('cvs',v)}
          info="アクティブユーザーのうち「訪問予約済」タグがある数"
        />
        <KPICard 
          title="成約率 (CVR)" 
          value={getVal('cvRate', Number(currMetrics.cvRate.toFixed(1)))} 
          unit="%" 
          icon="bar-chart-2" 
          change={calcPointDiff(currMetrics.cvRate, prevMetrics.cvRate)}
          changeLabel="pt前期間比"
          editable={editMode} onValueChange={(v:number) => setVal('cvRate',v)}
          info="訪問予約済(CV) ÷ アクティブ数 × 100"
        />
        <KPICard 
          title="未予約者 プッシュタップ率" 
          value={getVal('pushTapRate', Number(currMetrics.pushTapRate.toFixed(1)))} 
          unit="%" 
          icon="trending-up" 
          change={calcPointDiff(currMetrics.pushTapRate, prevMetrics.pushTapRate)}
          editable={editMode} onValueChange={(v:number) => setVal('pushTapRate',v)}
          subText={`母数: ${currMetrics.pushTargets.toLocaleString()}人 (CV未到達)`}
          info="訪問予約をしていないアクティブユーザーの中で、「訪問予約_タップ」をした割合"
        />
        <KPICard 
          title="ブロック数" 
          value={getVal('blocks', currMetrics.blocks)} 
          unit="人" 
          icon="user-minus" 
          subText={`ブロック率 ${currMetrics.blockRate.toFixed(1)}%`}
          editable={editMode} onValueChange={(v:number) => setVal('blocks',v)}
          info="「ユーザーブロック」があるユーザー数"
        />
        <KPICard 
          title="予約キャンセル数" 
          value={getVal('cancels', currMetrics.cancels)} 
          unit="件" 
          icon="x-circle" 
          subText={`キャンセル率 ${currMetrics.cancelRate.toFixed(1)}%`}
          editable={editMode} onValueChange={(v:number) => setVal('cancels',v)}
          info="アクティブユーザーのうち「訪問予約_キャンセル」がある数。率はキャンセル÷予約済×100"
        />
      </div>

      {/* FUNNEL MATRIX EXCEL-LIKE */}
      <div className="mb-10">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-[18px] font-semibold flex items-center gap-2"><IconComp name="table" className="text-[#0067b8]"/> シナリオステップ分析 マトリクス</h2>
          <div className="flex bg-[#f2f2f2] p-1 rounded-lg">
            <button onClick={() => setTableMode('period')} className={`px-4 py-1.5 text-xs font-semibold rounded-md ${tableMode==='period' ? 'bg-white shadow-sm text-[#000]' : 'text-[#666] hover:bg-gray-200'}`}>期間別合算</button>
            <button onClick={() => setTableMode('inflow')} className={`px-4 py-1.5 text-xs font-semibold rounded-md ${tableMode==='inflow' ? 'bg-white shadow-sm text-[#000]' : 'text-[#666] hover:bg-gray-200'}`}>流入経路別 (全期間比較)</button>
          </div>
        </div>
        
        <div className="card overflow-x-auto overflow-y-auto max-h-[500px]">
          <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
            <thead className="bg-[#f2f2f2] text-[#666] sticky top-0 z-20 font-semibold shadow-sm text-[11px] uppercase tracking-wider">
              <tr>
                <th className="p-3 font-semibold border-r-2 border-[#d2d2d2] sticky left-0 bg-[#f2f2f2] z-30 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.1)] min-w-[120px]">
                  {tableMode === 'period' ? periodType : '流入経路'}
                </th>
                {FUNNEL_STEPS.map((s, i) => (
                  <th key={s.label} colSpan={3} className="px-3 border-r-2 border-[#d2d2d2] text-center border-b border-[#e2e2e2] bg-[#f9f9f9]">
                    <div className="py-2 border-b border-[#e2e2e2] font-bold text-[#333] mb-1">{s.label}</div>
                    <div className="flex justify-between font-medium">
                      <span className="flex-1">対象</span>
                      <span className="flex-1">tap</span>
                      <span className="flex-[1.5] border-l border-[#e2e2e2] ml-1 pl-1 text-[#0067b8]">タップ率</span>
                    </div>
                  </th>
                ))}
                <th className="p-2 text-right border-l border-[#e2e2e2]">アクティブ合計</th>
                <th className="p-2 text-right text-[#0067b8]">予約済 (CV)</th>
                <th className="p-2 text-right text-[#107c10]">成約率</th>
              </tr>
            </thead>
            <tbody>
              {matrixData.map((row) => (
                <TableRow key={row.name} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CHARTS */}
      <h2 className="text-[#000] font-semibold text-[18px] mb-4 mt-6 flex items-center gap-2"><IconComp name="bar-chart-2" className="text-[#0067b8]"/> 推移 & 経路分析</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        
        {/* CV & Rate Trend */}
        <div className="card p-6 h-[400px] flex flex-col">
          <h3 className="text-sm font-semibold mb-4 text-[#666]">登録数・CV数の推移 ({periodType})</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={matrixData.slice(0, 15).reverse()} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid stroke="#f2f2f2" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e2e2e2' }} dy={10} />
                <YAxis yAxisId="left" tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v)=>`${v}%`} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar yAxisId="left" dataKey="active" name="アクティブ数" fill="#f2f2f2" radius={[4,4,0,0]} barSize={32} />
                <Bar yAxisId="left" dataKey="cv" name="予約済 (CV)" fill="#0067b8" radius={[4,4,0,0]} barSize={32} />
                <Line yAxisId="right" type="monotone" dataKey="cvRate" name="成約率" stroke="#107c10" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* INFLOW Analysis (ONLY applicable if inflow mode is parsed) */}
        <div className="card p-6 h-[400px] flex flex-col">
          <h3 className="text-sm font-semibold mb-4 text-[#666]">流入経路ごとの獲得割合 (全期間)</h3>
          <div className="flex-1 min-h-0 flex flex-row items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" wrapperStyle={{ fontSize: 11, paddingLeft: 10 }} />
                <Pie data={generateGroupMatrix('inflow').filter(r => r.active > 0)} dataKey="active" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} label={false}>
                  {generateGroupMatrix('inflow').map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* RAW DATA TABLE */}
      <h2 className="text-[#000] font-semibold text-[18px] mb-4 mt-6 flex items-center gap-2"><IconComp name="clipboard-list" className="text-[#0067b8]"/> 生データ (上位50件)</h2>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-[13px] whitespace-nowrap">
          <thead className="bg-[#f2f2f2] text-[#666] font-semibold text-[12px] border-b border-[#e2e2e2]">
            <tr>
              {headers.map(h => <th key={h} className="p-3 whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filteredData.slice(0, 50).map((row, i) => (
              <tr key={i} className="border-b border-[#f2f2f2] hover:bg-[#f9f9f9] transition-colors">
                {headers.map(h => {
                  let v = row[h];
                  if (v === '1' || v === 1) v = '〇';
                  else if (v === '0' || v === 0 || v === '') v = '-';
                  return <td key={h} className="p-3">{v}</td>;
                })}
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr><td colSpan={headers.length} className="p-8 text-center text-[#666]">データがありません</td></tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
