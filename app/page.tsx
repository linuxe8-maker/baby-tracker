// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Plus, Milk, Heart, Trash2, Baby } from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

// Đăng ký thành phần biểu đồ
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

// --- CẤU HÌNH ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl || '', supabaseKey || '')
const BREAST_FEED_RATE = 5 

export default function BabyTracker() {
  const [mode, setMode] = useState('bottle')
  const [val, setVal] = useState(120)
  const [feedTime, setFeedTime] = useState('')
  const [feedings, setFeedings] = useState([])
  const [loading, setLoading] = useState(true)
  const [isConfigured, setIsConfigured] = useState(true)

  useEffect(() => {
    // Kiểm tra cấu hình
    if (!supabaseUrl || !supabaseKey) {
        setIsConfigured(false);
        setLoading(false);
        return;
    }

    const now = new Date()
    const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
    setFeedTime(localIso)
    fetchFeedings()
  }, [])

  const fetchFeedings = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('feedings')
      .select('*')
      .order('fed_at', { ascending: false })
      .limit(100)
    
    if (!error) setFeedings(data || [])
    setLoading(false)
  }

  const handleAdd = async () => {
    let finalAmount = mode === 'bottle' ? val : val * BREAST_FEED_RATE
    let duration = mode === 'bottle' ? 0 : val

    const newFeeding = {
      amount_ml: finalAmount,
      duration_minutes: duration,
      milk_type: mode === 'bottle' ? 'formula' : 'breast_milk',
      fed_at: new Date(feedTime).toISOString()
    }

    const { data, error } = await supabase.from('feedings').insert([newFeeding]).select()

    if (!error) {
      setFeedings([data[0], ...feedings])
      if (mode === 'breast') setVal(15) 
    } else {
      alert('Lỗi lưu: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Xóa dòng này?')) return
    const { error } = await supabase.from('feedings').delete().eq('id', id)
    if (!error) setFeedings(feedings.filter((f) => f.id !== id))
  }

  const getChartData = () => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      return d
    }).reverse()

    const data = last7Days.map((date) => {
      const dateStr = date.toLocaleDateString('vi-VN')
      const total = feedings
        .filter((f) => new Date(f.fed_at).toLocaleDateString('vi-VN') === dateStr)
        .reduce((sum, f) => sum + f.amount_ml, 0)
      return { date: dateStr.slice(0, 5), total }
    })

    return {
      labels: data.map((d) => d.date),
      datasets: [{
          label: 'ml',
          data: data.map((d) => d.total),
          backgroundColor: '#3b82f6',
          borderRadius: 4,
        }],
    }
  }

  const totalToday = feedings.reduce((sum, item) => {
    const d = new Date(item.fed_at)
    const t = new Date()
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() ? sum + item.amount_ml : sum
  }, 0)

  const quickML = [60, 90, 120, 150, 180, 210]
  const quickMin = [5, 10, 15, 20, 30, 40]

  if (!isConfigured) {
      return (
          <div className="min-h-screen flex items-center justify-center p-4 bg-red-50 text-red-800 text-center">
              <div>
                  <h1 className="text-2xl font-bold mb-2">Chưa kết nối Database!</h1>
                  <p>Hãy đẩy code lên Vercel và điền Environment Variables.</p>
              </div>
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
      <div className="bg-blue-600 text-white p-6 rounded-b-3xl shadow-lg sticky top-0 z-20">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold flex gap-2 items-center"><Baby /> Baby Tracker</h1>
          <input type="datetime-local" value={feedTime} onChange={(e) => setFeedTime(e.target.value)}
            className="text-slate-800 text-xs px-2 py-1 rounded bg-blue-100 border-none outline-none" />
        </div>
        <div className="text-center">
          <p className="text-blue-100 text-xs uppercase tracking-wider">Tổng sữa hôm nay</p>
          <p className="text-5xl font-extrabold mt-1">{totalToday}<span className="text-2xl font-medium">ml</span></p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-6 relative z-30">
        <div className="bg-white rounded-2xl shadow-xl p-5 mb-6">
          <div className="flex bg-slate-100 rounded-lg p-1 mb-6">
            <button onClick={() => { setMode('bottle'); setVal(120) }}
              className={`flex-1 py-3 rounded-md text-sm font-bold transition-all flex gap-2 justify-center items-center ${mode === 'bottle' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>
              <Milk size={16} /> Bình (ml)
            </button>
            <button onClick={() => { setMode('breast'); setVal(15) }}
              className={`flex-1 py-3 rounded-md text-sm font-bold transition-all flex gap-2 justify-center items-center ${mode === 'breast' ? 'bg-white shadow text-pink-500' : 'text-slate-400'}`}>
              <Heart size={16} /> Mẹ (phút)
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {(mode === 'bottle' ? quickML : quickMin).map((num) => (
              <button key={num} onClick={() => setVal(num)}
                className={`py-3 rounded-xl font-bold text-lg border-2 transition-all ${val === num ? (mode === 'bottle' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-pink-500 bg-pink-50 text-pink-700') : 'border-slate-100 text-slate-500'}`}>
                {num}
              </button>
            ))}
          </div>

          <div className="mb-2">
            <input type="range" min={mode === 'bottle' ? 10 : 1} max={mode === 'bottle' ? 300 : 60} step={mode === 'bottle' ? 5 : 1}
              value={val} onChange={(e) => setVal(Number(e.target.value))}
              className={`w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer mb-2 ${mode === 'bottle' ? 'accent-blue-600' : 'accent-pink-500'}`} />
          </div>
          <p className="text-center text-2xl font-bold text-slate-700 mb-4">
            {val} {mode === 'bottle' ? 'ml' : 'phút'}
            {mode === 'breast' && <span className="block text-xs text-slate-400 font-normal mt-1">≈ {val * BREAST_FEED_RATE}ml</span>}
          </p>

          <button onClick={handleAdd}
            className={`w-full text-white py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 flex justify-center items-center gap-2 ${mode === 'bottle' ? 'bg-blue-600 shadow-blue-200' : 'bg-pink-500 shadow-pink-200'}`}>
            <Plus /> Lưu lại
          </button>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm mb-6">
           <h3 className="text-slate-500 font-bold text-xs uppercase mb-2">Biểu đồ tuần</h3>
           <Bar data={getChartData()} options={{ plugins: { legend: { display: false } } }} />
        </div>

        <div className="space-y-3 pb-10">
          {loading && <p className="text-center text-slate-400">Đang tải...</p>}
          {feedings.map((item) => (
            <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${item.milk_type === 'formula' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-500'}`}>
                  {item.milk_type === 'formula' ? <Milk size={20} /> : <Heart size={20} />}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-lg">
                    {item.amount_ml} ml
                    {item.duration_minutes > 0 && <span className="text-sm font-normal text-slate-400 ml-1">({item.duration_minutes}p)</span>}
                  </p>
                  <p className="text-xs text-slate-400 font-medium">
                    {new Date(item.fed_at).getHours()}:{String(new Date(item.fed_at).getMinutes()).padStart(2, '0')} • {new Date(item.fed_at).getDate()}/{new Date(item.fed_at).getMonth() + 1}
                  </p>
                </div>
              </div>
              <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-300 active:text-red-500"><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}