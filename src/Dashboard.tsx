import { useState, useMemo, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import {
  Users, Building2, FlaskConical, Bot, BarChart3,
  TrendingUp, Activity, AlertTriangle, FileText, Network,
  Smile,
} from "lucide-react";

/* ─── 动效：数字滚动 ─────────────────────────────────────────────────
   target 变化时从"当前显示值"缓动到新值（不会跳回 0），用于实时跳动的计数器 */
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

function useCountUp(target: number, duration = 1000, delay = 0) {
  const [v, setV] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    let raf = 0;
    let start = 0;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      const val = from + (target - from) * easeOutCubic(p);
      setV(val);
      fromRef.current = val;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    const timer = window.setTimeout(() => { raf = requestAnimationFrame(tick); }, delay);
    return () => { window.clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [target, duration, delay]);
  return v;
}

/** 系统「减弱动态效果」开关 */
function usePrefersReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(m.matches);
    const h = (e: MediaQueryListEvent) => setR(e.matches);
    m.addEventListener("change", h);
    return () => m.removeEventListener("change", h);
  }, []);
  return r;
}

/** 把 "64%" / "¥2.4" / "1,284" 这类展示串里的数字滚动出来，前后缀原样保留 */
function AnimNum({ value, duration = 1000, delay = 0 }: { value: string | number; duration?: number; delay?: number }) {
  const raw = String(value);
  const m = raw.match(/^([^\d]*)([\d,]+(?:\.\d+)?)(.*)$/);
  const target = m ? parseFloat(m[2].replace(/,/g, "")) : NaN;
  const v = useCountUp(Number.isFinite(target) ? target : 0, duration, delay);
  if (!m || !Number.isFinite(target) || target === 0) return <>{raw}</>;
  const dec = m[2].includes(".") ? m[2].split(".")[1].length : 0;
  const shown = m[2].includes(",")
    ? v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec })
    : v.toFixed(dec);
  return <>{m[1]}{shown}{m[3]}</>;
}

// ─── Mock 数据 ────────────────────────────────────────────────────────────────
const COMMUNITIES = [
  { id: "cm-1", name: "杨柳郡未来社区", tag: "社区样板" },
];

// 实时回传播报（单行轮播，验收：数据展示实时性）
const LIVE_TICKER = [
  { t: "12:03:41", text: "【协商博弈】智能体 A02 王晓燕 第 6 轮 支持方案C·混合功能区" },
  { t: "12:03:12", text: "【行为决策】游客108 完成第 3 轮，实际支付 ¥2.5，公益 ¥0.5" },
  { t: "12:02:47", text: "【协商博弈】智能体 B01 张桂芳 第 6 轮 反对：配送站太吵" },
  { t: "12:02:20", text: "【意愿采集】游客31 选择 参保" },
  { t: "12:01:18", text: "【行为决策】游客112 完成第 3 轮，实际支付 ¥4.5，公益 ¥2.5" },
];

// 实验生命周期节点（统一三节点：启动 → 进行中 → 结束归档）
// 只依赖实验的开始/结束时间与当前进度聚合，不依赖逐轮实时回传
const TIMELINE_BY_TYPE: Record<string, { label: string; desc: string; done: boolean; active?: boolean }[]> = {
  "协商博弈": [
    { label: "实验启动", desc: "2026-07-22 09:00", done: true },
    { label: "进行中", desc: "第 6/10 轮 · 支持率 64%", done: false, active: true },
    { label: "结束归档", desc: "待完成", done: false },
  ],
  "行为决策": [
    { label: "实验启动", desc: "2026-07-20 09:00", done: true },
    { label: "进行中", desc: "回收 126/137 份", done: false, active: true },
    { label: "结束归档", desc: "待完成", done: false },
  ],
  "意愿采集": [
    { label: "实验启动", desc: "2026-07-23 08:30", done: true },
    { label: "进行中", desc: "回收 89/98 份", done: false, active: true },
    { label: "结束归档", desc: "待完成", done: false },
  ],
};

const KPIS = [
  { label: "实验总量", value: "3", sub: "运行中 3 · 已结束 0", icon: FlaskConical, color: "#4cc9f0", trend: [8, 12, 9, 14, 11, 16, 13] },
  { label: "累计参与", value: "355", sub: "真人 330 · 智能体 25", icon: Users, color: "#6ee7ff", trend: [10, 8, 13, 11, 15, 12, 17] },
  { label: "数据回传", value: 326, sub: "较昨日 +12.4%", icon: BarChart3, color: "#4cc9f0", trend: [6, 11, 9, 13, 10, 15, 18], live: true },
  { label: "结果回收率", value: "87.9%", sub: "有效样本 290/330", icon: TrendingUp, color: "#ffc857", trend: [12, 10, 14, 12, 16, 14, 18] },
];

// result 字段按实验类型呈现不同结果：协商博弈=支持率；行为决策=捐赠意愿；意愿采集=参保意愿
const EXP_OVERVIEW = [
  { id: "SP-001", name: "公共设施选址协商", type: "协商博弈", community: "杨柳郡", status: "运行中", result: "支持率 64%", resultPct: 64, source: "真人议题×智能体讨论", participants: 95, rounds: "6/10" },
  { id: "CW-001", name: "一瓶水的故事", type: "行为决策", community: "杨柳郡", status: "运行中", result: "捐赠意愿 74% · 人均 ¥2.4", resultPct: 74, source: "真人输入", participants: 137, rounds: "3/5" },
  { id: "YL-002", name: "益联保参保意愿", type: "意愿采集", community: "杨柳郡", status: "运行中", result: "参保意愿 55%", resultPct: 55, source: "真人输入", participants: 98, rounds: "4/8" },
];

const ALERTS = [
  { level: "预警", exp: "YL-002", text: "新市民群体参保率 31%，低于全体均值 55%（偏差 -24%）", time: "11:42" },
  { level: "提示", exp: "SP-001", text: "单身青年群体连续 2 轮支持率波动 >15%", time: "11:20" },
  { level: "提示", exp: "CW-001", text: "今日回传量较昨日下降 8%", time: "10:05" },
];

const COMMUNITY_PROFILE: Record<string, {
  pop: { g: string; r: number }[];
  service: { c: string; n: number }[];
  welfare: { satisfaction: number; needs: { n: string; v: number }[] };
  env: { label: string; value: string }[];
}> = {
  "cm-1": {
    pop: [{ g: "中青年家庭", r: 30 }, { g: "老年", r: 20 }, { g: "新市民", r: 30 }, { g: "单身青年", r: 20 }],
    service: [{ c: "基本公共服务", n: 7 }, { c: "便民商业", n: 6 }, { c: "公共空间", n: 6 }, { c: "职能管理", n: 4 }, { c: "居民楼", n: 4 }],
    welfare: { satisfaction: 66, needs: [{ n: "停车位", v: 82 }, { n: "买菜距离", v: 76 }, { n: "托育接送", v: 64 }, { n: "健身设施", v: 58 }, { n: "医疗服务", v: 51 }] },
    env: [{ label: "绿地率", value: "35%" }, { label: "容积率", value: "2.4" }, { label: "15分钟生活圈覆盖", value: "88%" }],
  },
};

const SUPPORT_TREND = [
  { round: 1, all: 48, a: 52, b: 40, c: 45, d: 55 },
  { round: 2, all: 51, a: 56, b: 42, c: 48, d: 58 },
  { round: 3, all: 55, a: 60, b: 44, c: 52, d: 62 },
  { round: 4, all: 57, a: 61, b: 46, c: 55, d: 64 },
  { round: 5, all: 58, a: 63, b: 45, c: 58, d: 65 },
  { round: 6, all: 64, a: 70, b: 48, c: 66, d: 70 },
];

// CW「一瓶水的故事」三个子实验（同一实验启动后随机分配，三臂均为干预条件，本实验无对照组）
const CW_SUB_EXPS = [
  { id: "CW-0001", name: "爱心溢价效应", role: "实验组", desc: "瓶身加公益告知语，测试溢价支付意愿", participants: 52, valid: 48, willing: 79, avg: "¥2.1", total: "¥100.8", note: "带「公益告知语」批次，捐赠意愿最高" },
  { id: "CW-0002", name: "爱心撬动效应", role: "实验组", desc: "现场公益榜联动，测试从众撬动效应", participants: 45, valid: 41, willing: 78, avg: "¥1.6", total: "¥65.6", note: "看到他人捐赠记录后意愿上升" },
  { id: "CW-0003", name: "爱心锚定效应", role: "实验组", desc: "数量锚定（买一捐一 / 多付 0.1 捐一瓶），测试锚定倾向", participants: 40, valid: 37, willing: 62, avg: "¥1.5", total: "¥55.5", note: "锚定呈现下的捐赠意愿最低" },
];

const AGENTS: AgentRow[] = [
  { code: "C04", name: "老张", gender: "男", age: 50, job: "个体户", hukou: "流动", group: "新市民", satisfaction: 65, persuasion: 0.85, role: "个体", contribution: 81 },
  { code: "A08", name: "吴秀英", gender: "女", age: 49, job: "小学教师", hukou: "本市", group: "中青年家庭", satisfaction: 85, persuasion: 0.8, role: "个体", contribution: 78 },
  { code: "C05", name: "小美", gender: "女", age: 20, job: "电商客服", hukou: "流动", group: "新市民", satisfaction: 62, persuasion: 0.75, role: "个体", contribution: 75 },
  { code: "D03", name: "吴凯", gender: "男", age: 22, job: "外卖骑手", hukou: "流动", group: "单身青年", satisfaction: 50, persuasion: 0.75, role: "个体", contribution: 75 },
  { code: "C01", name: "陈小龙", gender: "男", age: 24, job: "快递员", hukou: "流动", group: "新市民", satisfaction: 58, persuasion: 0.5, role: "代表", contribution: 70 },
  { code: "D01", name: "李昊", gender: "男", age: 26, job: "互联网开发工程师", hukou: "本市", group: "单身青年", satisfaction: 66, persuasion: 0.5, role: "代表", contribution: 70 },
  { code: "A05", name: "陈志远", gender: "男", age: 28, job: "银行柜员", hukou: "本市", group: "中青年家庭", satisfaction: 78, persuasion: 0.65, role: "个体", contribution: 69 },
  { code: "C03", name: "小玲", gender: "女", age: 22, job: "餐厅服务员", hukou: "流动", group: "新市民", satisfaction: 55, persuasion: 0.65, role: "个体", contribution: 69 },
  { code: "D05", name: "陈浩宇", gender: "男", age: 25, job: "健身教练", hukou: "流动", group: "单身青年", satisfaction: 68, persuasion: 0.65, role: "个体", contribution: 69 },
  { code: "A02", name: "王晓燕", gender: "女", age: 31, job: "互联网大厂产品经理", hukou: "本市", group: "中青年家庭", satisfaction: 88, persuasion: 0.45, role: "代表", contribution: 67 },
  { code: "D02", name: "赵雨萌", gender: "女", age: 29, job: "自由职业设计师", hukou: "流动", group: "单身青年", satisfaction: 72, persuasion: 0.6, role: "个体", contribution: 66 },
  { code: "A04", name: "刘梅", gender: "女", age: 43, job: "全职家庭主妇", hukou: "本市", group: "中青年家庭", satisfaction: 74, persuasion: 0.55, role: "个体", contribution: 63 },
  { code: "C06", name: "刘大海", gender: "男", age: 42, job: "餐馆厨师", hukou: "流动", group: "新市民", satisfaction: 60, persuasion: 0.55, role: "个体", contribution: 63 },
  { code: "B06", name: "黄志明", gender: "男", age: 65, job: "退休司机", hukou: "本市", group: "老年群体", satisfaction: 68, persuasion: 0.5, role: "个体", contribution: 60 },
  { code: "B03", name: "李淑珍", gender: "女", age: 58, job: "退休教师", hukou: "本市", group: "老年群体", satisfaction: 72, persuasion: 0.4, role: "个体", contribution: 54 },
  { code: "C02", name: "阿强", gender: "男", age: 33, job: "建筑工人", hukou: "流动", group: "新市民", satisfaction: 40, persuasion: 0.4, role: "个体", contribution: 54 },
  { code: "B05", name: "赵秀兰", gender: "女", age: 71, job: "退休会计", hukou: "本市", group: "老年群体", satisfaction: 73, persuasion: 0.35, role: "个体", contribution: 51 },
  { code: "B01", name: "张桂芳", gender: "女", age: 67, job: "退休工人", hukou: "本市", group: "老年群体", satisfaction: 60, persuasion: 0.1, role: "代表", contribution: 46 },
  { code: "B02", name: "王德顺", gender: "男", age: 72, job: "退休干部", hukou: "本市", group: "老年群体", satisfaction: 75, persuasion: 0.25, role: "个体", contribution: 45 },
  { code: "D04", name: "周婷", gender: "女", age: 38, job: "银行柜员", hukou: "本市", group: "单身青年", satisfaction: 78, persuasion: 0.25, role: "个体", contribution: 45 },
  { code: "A03", name: "张伟", gender: "男", age: 39, job: "私企销售主管", hukou: "本市", group: "中青年家庭", satisfaction: 50, persuasion: 0.2, role: "个体", contribution: 42 },
  { code: "A01", name: "李建国", gender: "男", age: 52, job: "公办高中数学教师", hukou: "本市", group: "中青年家庭", satisfaction: 58, persuasion: 0.15, role: "个体", contribution: 39 },
  { code: "A06", name: "赵丽华", gender: "女", age: 58, job: "企业行政主管", hukou: "本市", group: "中青年家庭", satisfaction: 55, persuasion: 0.1, role: "个体", contribution: 36 },
  { code: "A07", name: "孙浩", gender: "男", age: 36, job: "建筑设计师", hukou: "本市", group: "中青年家庭", satisfaction: 63, persuasion: 0.05, role: "个体", contribution: 33 },
  { code: "B04", name: "陈福生", gender: "男", age: 82, job: "退休工人", hukou: "本市", group: "老年群体", satisfaction: 45, persuasion: 0.05, role: "个体", contribution: 33 },
];

// 配置期人际关系（来自智能体档案的 relationships 字段：友好 / 中立 / 不友好）
const AGENT_NETWORK = [
  { from: "A03", to: "A08", type: "友好" },
  { from: "A03", to: "A07", type: "不友好" },
  { from: "A02", to: "A05", type: "友好" },
  { from: "A04", to: "A08", type: "友好" },
  { from: "A04", to: "A03", type: "中立" },
  { from: "A01", to: "A06", type: "友好" },
  { from: "A06", to: "A07", type: "不友好" },
  { from: "A05", to: "A08", type: "友好" },
  { from: "A02", to: "A08", type: "中立" },
  { from: "B01", to: "B02", type: "友好" },
  { from: "B01", to: "B06", type: "友好" },
  { from: "B02", to: "B03", type: "友好" },
  { from: "B04", to: "B01", type: "中立" },
  { from: "B04", to: "B05", type: "不友好" },
  { from: "B05", to: "B06", type: "友好" },
  { from: "B03", to: "B06", type: "中立" },
  { from: "C01", to: "C02", type: "友好" },
  { from: "C01", to: "C06", type: "友好" },
  { from: "C01", to: "C04", type: "友好" },
  { from: "C02", to: "C04", type: "中立" },
  { from: "C03", to: "C05", type: "友好" },
  { from: "C03", to: "C02", type: "不友好" },
  { from: "C04", to: "C06", type: "友好" },
  { from: "C05", to: "C01", type: "中立" },
  { from: "D01", to: "D04", type: "中立" },
  { from: "D01", to: "D03", type: "中立" },
  { from: "D02", to: "D05", type: "友好" },
  { from: "D03", to: "D05", type: "不友好" },
  { from: "D04", to: "D02", type: "友好" },
  { from: "B05", to: "A03", type: "友好" },
  { from: "D01", to: "A02", type: "中立" },
  { from: "C01", to: "A04", type: "友好" },
  { from: "C01", to: "B01", type: "友好" },
  { from: "C04", to: "B02", type: "友好" },
  { from: "C04", to: "A01", type: "中立" },
  { from: "D05", to: "B06", type: "友好" },
  { from: "C02", to: "A07", type: "不友好" },
  { from: "D04", to: "C05", type: "中立" },
];
const NETWORK_NODES = [
  { code: "A08", x: 35.0, y: 18.8 },
  { code: "A05", x: 43.9, y: 22.1 },
  { code: "A02", x: 53.0, y: 30.0 },
  { code: "A04", x: 43.9, y: 37.9 },
  { code: "A03", x: 35.0, y: 41.2 },
  { code: "A01", x: 26.1, y: 37.9 },
  { code: "A06", x: 22.4, y: 30.0 },
  { code: "A07", x: 26.1, y: 22.1 },
  { code: "B06", x: 68.0, y: 16.8 },
  { code: "B03", x: 78.9, y: 22.4 },
  { code: "B05", x: 78.9, y: 33.6 },
  { code: "B01", x: 68.0, y: 44.0 },
  { code: "B02", x: 57.1, y: 33.6 },
  { code: "B04", x: 57.1, y: 22.4 },
  { code: "C04", x: 30.0, y: 60.8 },
  { code: "C05", x: 40.9, y: 66.4 },
  { code: "C01", x: 45.6, y: 80.0 },
  { code: "C03", x: 30.0, y: 83.2 },
  { code: "C06", x: 19.1, y: 77.6 },
  { code: "C02", x: 19.1, y: 66.4 },
  { code: "D03", x: 70.0, y: 58.8 },
  { code: "D01", x: 87.1, y: 65.1 },
  { code: "D05", x: 77.4, y: 79.1 },
  { code: "D02", x: 62.6, y: 79.1 },
  { code: "D04", x: 58.0, y: 66.5 },
];

const AGENT_SATISFACTION_TREND = [
  { round: 1, A: 70, B: 58, C: 48, D: 66 },
  { round: 2, A: 73, B: 56, C: 45, D: 64 },
  { round: 3, A: 76, B: 57, C: 46, D: 65 },
  { round: 4, A: 79, B: 55, C: 47, D: 67 },
  { round: 5, A: 82, B: 57, C: 47, D: 66 },
  { round: 6, A: 86, B: 58, C: 48, D: 66 },
];

// ─── 图表配色（青瓷玉 × 琥珀金 系） ────────────────────────────────────────────
const CHART_GRID = "rgba(76,201,240,0.12)";
const CHART_TEXT = "#7e9cc4";

// ─── 通用小组件 ───────────────────────────────────────────────────────────────
function Panel({ title, extra, children, className = "" }: { title?: string; extra?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`panel p-4 ${className}`}>
      {title && (
        <div className="flex items-center justify-between mb-3">
          <div className="text-[13px] font-bold text-[#dceafc] flex items-center gap-2 tracking-wide">
            <span className="w-1.5 h-1.5 rotate-45 bg-[#4cc9f0] shadow-[0_0_8px_#4cc9f0]" />
            {title}
          </div>
          {extra}
        </div>
      )}
      {children}
    </div>
  );
}

function Bar({ pct, color = "#4cc9f0", h = 8 }: { pct: number; color?: string; h?: number }) {
  return (
    <div className="flex-1 rounded-sm bg-[#4cc9f0]/10 overflow-hidden" style={{ height: h }}>
      <div className="h-full bar-fill" style={{
        width: `${pct}%`,
        background: `linear-gradient(90deg, ${color}55, ${color})`,
        boxShadow: `0 0 8px ${color}66`,
      }} />
    </div>
  );
}

function LineChart({ data, series, height = 160, autoplay = true }: {
  data: Record<string, any>[];
  series: { key: string; color: string; label: string }[];
  height?: number;
  autoplay?: boolean;
}) {
  const W = 560, H = height, P = { l: 34, r: 8, t: 10, b: 22 };
  const n = data.length;
  const vals = data.flatMap(d => series.map(s => Number(d[s.key]) || 0));
  const min = Math.min(...vals, 0), max = Math.max(...vals, 100);
  const sx = (i: number) => P.l + (i / Math.max(1, n - 1)) * (W - P.l - P.r);
  const sy = (v: number) => P.t + (1 - (v - min) / (max - min || 1)) * (H - P.t - P.b);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [autoIdx, setAutoIdx] = useState(0);
  const reduce = usePrefersReducedMotion();

  // 未悬停时自动轮播：第 1 轮 → 末轮 → 循环（悬停即暂停并跟随鼠标）
  useEffect(() => {
    if (!autoplay || reduce || hover !== null || n === 0) return;
    const t = window.setInterval(() => setAutoIdx(i => (i + 1) % n), 1100);
    return () => window.clearInterval(t);
  }, [autoplay, reduce, hover, n]);

  const act = hover ?? (n ? Math.min(autoIdx, n - 1) : 0);
  const row: Record<string, any> = data[act] ?? {};
  const roundLabel = row.round ?? row.exp ?? act + 1;

  // 鼠标水平位置 → 最近的一轮
  const onMove = (e: React.MouseEvent) => {
    const el = svgRef.current;
    if (!el || n === 0) return;
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0, bd = Infinity;
    for (let i = 0; i < n; i++) {
      const dd = Math.abs(sx(i) - px);
      if (dd < bd) { bd = dd; best = i; }
    }
    setHover(best);
  };

  // 提示卡（保持在 viewBox 内，靠右时自动翻到左侧）
  const rows = series.map(s => ({ key: s.key, label: s.label, color: s.color, v: Number(row[s.key]) || 0 }));
  const TW = Math.min(168, Math.max(80, Math.round(47 + Math.max(...series.map(s => s.label.length)) * 7.2)));
  const TH = 16 + rows.length * 11 + 4;
  let tx = sx(act) + 9;
  if (tx + TW > W - P.r) tx = sx(act) - 9 - TW;
  tx = Math.max(P.l - 4, Math.min(tx, W - P.r - TW));
  const ty = Math.max(2, Math.min(P.t + 1, H - P.b - TH));

  return (
    <div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full cursor-crosshair"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          {series.map(s => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {[0, 25, 50, 75, 100].map(v => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={sy(v)} y2={sy(v)} stroke={CHART_GRID} strokeDasharray="3 3" />
            <text x={P.l - 6} y={sy(v) + 3} textAnchor="end" fontSize="9" fill={CHART_TEXT}>{v}</text>
          </g>
        ))}

        {/* 竖直参考线：用 translateX 驱动，自动轮播时平滑滑行 */}
        <line className="chart-glide" x1={0} x2={0} y1={P.t} y2={H - P.b}
          stroke="rgba(76,201,240,0.5)" strokeWidth="1" strokeDasharray="3 3"
          style={{ transform: `translateX(${sx(act)}px)` }} />

        {/* x 轴轮次标签（当前轮高亮） */}
        {data.map((_, i) => (
          <text key={i} x={sx(i)} y={H - 6} textAnchor="middle" fontSize="9"
            fill={i === act ? "#4cc9f0" : CHART_TEXT} fontWeight={i === act ? "bold" : "normal"}>
            {String(data[i].round ?? data[i].exp ?? i + 1)}
          </text>
        ))}

        {series.map((s, si) => (
          <g key={s.key}>
            <polygon className="chart-area"
              fill={`url(#grad-${s.key})`}
              points={`${sx(0)},${sy(0)} ${data.map((d, i) => `${sx(i)},${sy(Number(d[s.key]) || 0)}`).join(" ")} ${sx(data.length - 1)},${sy(0)}`} />
            <polyline className="chart-line" pathLength={1} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 4px ${s.color}66)`, animationDelay: `${si * 0.12}s` }}
              points={data.map((d, i) => `${sx(i)},${sy(Number(d[s.key]) || 0)}`).join(" ")} />
            {data.map((d, i) => (
              <circle key={i} className="chart-dot" cx={sx(i)} cy={sy(Number(d[s.key]) || 0)} r="3"
                fill="#0a1628" stroke={s.color} strokeWidth="2"
                style={{ animationDelay: `${0.5 + si * 0.12 + i * 0.06}s` }} />
            ))}
            {/* 当前轮强调点 */}
            <circle className="chart-glide" cx={0} cy={sy(Number(row[s.key]) || 0)} r="4.6"
              fill={s.color} stroke="#0a1628" strokeWidth="1.6"
              style={{ transform: `translateX(${sx(act)}px)`, filter: `drop-shadow(0 0 6px ${s.color})` }} />
          </g>
        ))}

        {/* 数值提示卡 */}
        <g className="chart-glide" pointerEvents="none" style={{ transform: `translate(${tx}px, ${ty}px)` }}>
          <rect x={0} y={0} width={TW} height={TH} rx="2"
            fill="rgba(10,22,40,0.95)" stroke="rgba(76,201,240,0.5)" />
          <text x={7} y={11.5} fontSize="7.5" fill="#4cc9f0" fontWeight="bold">第 {roundLabel} 轮</text>
          {rows.map((r, i) => (
            <g key={r.key}>
              <rect x={7} y={16 + i * 11} width="3" height="3" fill={r.color} />
              <text x={14} y={19.6 + i * 11} fontSize="7" fill="#dceafc">{r.label}</text>
              <text x={TW - 7} y={19.6 + i * 11} fontSize="7" fill={r.color} fontWeight="bold" textAnchor="end">{r.v}%</text>
            </g>
          ))}
        </g>
      </svg>
      <div className="flex gap-3 flex-wrap mt-1 items-center">
        {series.map(s => (
          <span key={s.key} className="flex items-center gap-1 text-[10px] text-[#7e9cc4]">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />{s.label}
          </span>
        ))}
        <span className="ml-auto text-[9px] text-[#7e9cc4]">
          {hover !== null
            ? `已锁定第 ${roundLabel} 轮 · 移开恢复自动轮播`
            : reduce ? "悬停查看逐轮数值" : "自动轮播中 · 悬停查看逐轮数值"}
        </span>
      </div>
    </div>
  );
}

function HBars({ items, color = "#4cc9f0", unit = "%", hideValue = false }: { items: { n: string; v: number }[]; color?: string; unit?: string; hideValue?: boolean }) {
  const max = Math.max(...items.map(i => i.v), 1);
  const labelW = Math.max(...items.map(i => i.n.length)) > 7 ? "w-32" : "w-20";
  return (
    <div className="space-y-1.5">
      {items.map(i => (
        <div key={i.n} className="flex items-center gap-2">
          <span className={`text-[11px] text-[#7e9cc4] ${labelW} shrink-0 truncate`}>{i.n}</span>
          <Bar pct={(i.v / max) * 100} color={color} />
          {!hideValue && <span className="text-[11px] num text-[#dceafc] w-12 text-right">{i.v}{unit}</span>}
        </div>
      ))}
    </div>
  );
}

type AgentRow = {
  code: string; name: string; gender: string; age: number; job: string;
  hukou: string; group: string; satisfaction: number; persuasion: number;
  role: string; contribution: number;
};

function NetworkGraph({ highlight = null }: { highlight?: string | null }) {
  const agentByCode = new Map(AGENTS.map(a => [a.code, a]));
  const related = highlight
    ? new Set(AGENT_NETWORK.filter(e => e.from === highlight || e.to === highlight).map(e => (e.from === highlight ? e.to : e.from)))
    : null;
  return (
    <svg viewBox="0 0 100 100" className="w-full" style={{ maxHeight: 300 }}>
      {AGENT_NETWORK.map((e, i) => {
        const stroke = e.type === "友好" ? "#4cc9f0" : e.type === "不友好" ? "#ff7a6b" : "rgba(126,156,196,0.6)";
        const width = e.type === "中立" ? 0.5 : 1.1;
        const dim = highlight && e.from !== highlight && e.to !== highlight;
        return (
          <line key={i} className="net-edge" pathLength={1}
            x1={NETWORK_NODES.find(n => n.code === e.from)!.x} y1={NETWORK_NODES.find(n => n.code === e.from)!.y}
            x2={NETWORK_NODES.find(n => n.code === e.to)!.x} y2={NETWORK_NODES.find(n => n.code === e.to)!.y}
            stroke={stroke} strokeWidth={width} opacity={dim ? 0.12 : highlight ? 0.95 : 0.65}
            style={{ animationDelay: `${Math.min(i * 0.03, 0.8)}s` }} />
        );
      })}
      {NETWORK_NODES.map((n, ni) => {
        const a = agentByCode.get(n.code);
        const deg = AGENT_NETWORK.filter(e => e.from === n.code || e.to === n.code).length;
        const isRep = a?.role === "代表";
        const isHi = highlight === n.code;
        const isRel = related?.has(n.code);
        const dim = highlight && !isHi && !isRel;
        return (
          <g key={n.code} opacity={dim ? 0.2 : 1}>
            <circle className="net-node" cx={n.x} cy={n.y} r={isRep ? 4.5 : deg >= 3 ? 4 : 3}
              fill={isRep ? "#ffc857" : "#5b8def"} stroke="#0a1628" strokeWidth="0.8"
              style={{ filter: isRep ? "drop-shadow(0 0 3px #ffc857)" : undefined, animationDelay: `${(ni % 8) * 0.22}s` }} />
            <text x={n.x} y={n.y - 5} textAnchor="middle" fontSize="4"
              fill={isRep ? "#ffc857" : "#7e9cc4"} fontWeight={isRep ? "bold" : "normal"}>{n.code}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Sparkline({ points, color, w = 110, h = 36 }: { points: number[]; color: string; w?: number; h?: number }) {
  const max = Math.max(...points), min = Math.min(...points);
  const px = (i: number) => (i / (points.length - 1)) * (w - 4) + 2;
  const py = (v: number) => h - 3 - ((v - min) / (max - min || 1)) * (h - 8);
  const d = points.map((v, i) => `${i === 0 ? "M" : "L"}${px(i)},${py(v)}`).join(" ");
  return (
    <svg width={w} height={h} className="shrink-0">
      <defs>
        <linearGradient id={`spg-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${px(points.length - 1)},${h} L${px(0)},${h} Z`} fill={`url(#spg-${color.slice(1)})`} />
      <path className="spark-line" pathLength={1} d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx={px(points.length - 1)} cy={py(points[points.length - 1])} r="2.2" fill={color} />
    </svg>
  );
}

function Ring({ pct, size = 34, color = "#4cc9f0" }: { pct: number; size?: number; color?: string }) {
  const r = (size - 6) / 2;
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(76,201,240,0.15)" strokeWidth="4" />
      <circle className="ring-arc" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
        pathLength={1} strokeDasharray={`${pct / 100} 1`}
        style={{ ["--ring-len" as string]: pct / 100 } as CSSProperties} />
    </svg>
  );
}

// ─── 页面 ─────────────────────────────────────────────────────────────────────
function OverviewPage() {
  // 模拟实时回传：回传量持续增长，数字滚动上跳并高亮
  const feedKpi: any = KPIS.find((k: any) => k.live)!;
  const [feed, setFeed] = useState(() => Number(feedKpi.value));
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => {
      setFeed(c => c + 1 + Math.floor(Math.random() * 2));
      setBeat(b => b + 1);
    }, 4200);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="space-y-4">
      {/* 实时回传播报（单行滚动） */}
      <div className="panel px-4 py-2 flex items-center gap-3 overflow-hidden">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#4cc9f0] shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4cc9f0] pulse-dot" />实时回传
        </span>
        <span className="h-3.5 w-px bg-[#4cc9f0]/25 shrink-0" />
        <div className="flex-1 overflow-hidden relative" style={{ maskImage: "linear-gradient(90deg, transparent, black 3%, black 97%, transparent)" }}>
          <div className="ticker-track">
            {[0, 1].map(dup => (
              <span key={dup} className="flex">
                {LIVE_TICKER.map((f, i) => (
                  <span key={i} className="text-[11px] text-[#b9d2f0] mr-10">
                    <span className="num text-[#7e9cc4] mr-2">{f.t}</span>{f.text}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* KPI 卡片带 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 stagger">
        {KPIS.map(k => (
          <div key={k.label} className="panel px-4 py-3.5 relative overflow-hidden group cursor-pointer transition-colors hover:border-[#4cc9f0]/50">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 flex items-center justify-center rounded-full border shrink-0" style={{ borderColor: `${k.color}44`, background: `${k.color}14` }}>
                <k.icon size={16} style={{ color: k.color }} />
              </span>
              <span className="text-[12px] text-[#b9d2f0] font-medium">{k.label}</span>
              <span className="ml-auto text-[#7e9cc4] text-sm transition-transform group-hover:translate-x-0.5">›</span>
            </div>
            <div className="flex items-end justify-between mt-2">
              <div>
                <div className={`text-[30px] leading-none font-bold num ${k.color === "#ffc857" ? "glow-gold" : "glow-cyan"}`} style={{ color: k.color }}>
                  {k.live ? (
                    <span key={beat} className="tick-flash inline-block"><AnimNum value={feed} duration={620} /></span>
                  ) : (
                    <AnimNum value={k.value} />
                  )}
                </div>
                <div className="text-[10px] text-[#7e9cc4] mt-2">{k.sub}</div>
              </div>
              <Sparkline points={k.trend} color={k.color} />
            </div>
          </div>
        ))}
      </div>

      {/* 实验运行全景 */}
      <Panel title="实验运行全景"
        extra={<span className="text-[10px] text-[#7e9cc4] tracking-wider">实验 × 社区 × 参与 × 结果</span>}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[760px]">
            <thead>
              <tr className="text-[#7e9cc4] border-b border-[#4cc9f0]/15">
                {["编号", "实验", "类型", "社区", "状态", "最新结果", "数据来源", "参与/场次", ""].map((h, i) => (
                  <th key={i} className="text-left py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EXP_OVERVIEW.map(e => (
                <tr key={e.id} className="border-b border-[#4cc9f0]/8 last:border-0 hover:bg-[#4cc9f0]/[0.04] transition-colors">
                  <td className="py-3">
                    <span className="px-2 py-0.5 num text-[11px] font-bold border border-[#4cc9f0]/40 text-[#4cc9f0] bg-[#4cc9f0]/8">{e.id}</span>
                  </td>
                  <td className="py-3 font-medium text-[#dceafc] whitespace-nowrap">{e.name}</td>
                  <td className="py-3 text-[#7e9cc4] whitespace-nowrap">{e.type}</td>
                  <td className="py-3 text-[#7e9cc4]">{e.community}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold border border-[#4cc9f0]/50 text-[#4cc9f0] bg-[#4cc9f0]/10">
                      <span className="w-1 h-1 rounded-full bg-[#4cc9f0] pulse-dot" />{e.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="num text-[#dceafc] text-[11px] whitespace-nowrap">{e.result}</span>
                      <div className="w-16"><Bar pct={e.resultPct} h={5} /></div>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] border ${e.source === "真人输入" ? "border-[#ffc857]/50 text-[#ffc857] bg-[#ffc857]/8" : "border-[#4cc9f0]/40 text-[#4cc9f0] bg-[#4cc9f0]/8"}`}>
                      {e.source === "真人输入" ? <Users size={10} /> : <Bot size={10} />}{e.source}
                    </span>
                  </td>
                  <td className="py-3 num text-[#7e9cc4] whitespace-nowrap">
                    {e.type === "协商博弈"
                      ? `${e.participants} 人 · ${SP_SESSION_STATS.count} 场`
                      : `${e.participants} 人`}
                  </td>
                  <td className="py-3 text-[#7e9cc4]">›</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* 底部：实验参与与回收情况 */}
      <Panel title="实验参与与回收情况">
        <div className="space-y-3.5 pt-1">
          {[
            { id: "SP-001 议题完成", v: 75, max: 95, c: "#4cc9f0", note: "" },
            { id: "CW-001 有效回收", v: 126, max: 137, c: "#ffc857" },
            { id: "YL-002 有效回收", v: 89, max: 98, c: "#9d7bea" },
          ].map((r, idx) => (
            <div key={r.id} className="flex items-center gap-3">
              <span className="text-[12px] num text-[#b9d2f0] w-32 shrink-0">{r.id}</span>
              <div className="flex-1 h-[9px] rounded-sm bg-[#4cc9f0]/8 overflow-hidden">
                <div className="h-full rounded-sm bar-fill" style={{
                  width: `${(r.v / r.max) * 100}%`,
                  background: `linear-gradient(90deg, ${r.c}66, ${r.c})`,
                  boxShadow: `0 0 10px ${r.c}55`,
                  animationDelay: `${idx * 100}ms`,
                }} />
              </div>
              <span className="num text-[13px] font-bold w-16 text-right" style={{ color: r.c }}><AnimNum value={r.v} delay={idx * 100} /><span className="text-[10px] font-normal text-[#7e9cc4]">/{r.max}</span></span>
              <span className="text-[9px] text-[#7e9cc4] w-20 shrink-0">{r.note}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-[#4cc9f0]/12 flex items-center justify-between">
          <div className="text-[11px] text-[#7e9cc4]">真人目标样本 <span className="num text-[#dceafc]">330</span> 份 · 已回收有效 <span className="num text-[#dceafc]">290</span> 份</div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#7e9cc4]">实验回收率</span>
            <span className="num text-[15px] font-bold text-[#4cc9f0] glow-cyan">87.9%</span>
            <Ring pct={87.9} />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-[#4cc9f0]/12 text-[10px] text-[#7e9cc4] leading-relaxed">
          口径：真人目标样本 = SP-001 95 + CW-001 137 + YL-002 98 = <span className="num text-[#dceafc]">330</span>；已回收有效 = 75 + 126 + 89 = <span className="num text-[#dceafc]">290</span>；实验回收率 = 290 ÷ 330 = <span className="num text-[#dceafc]">87.9%</span>，无效样本 40 份（含重复提交与必填项缺失）。SP-001 的样本为发起并参与议题的真人，实验内讨论由 25 个智能体执行，不重复计入真人回收率。
        </div>
      </Panel>
    </div>
  );
}

function CommunityPage() {
  const [sel, setSel] = useState("cm-1");
  const p = COMMUNITY_PROFILE[sel];
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-center">
        {COMMUNITIES.map(c => (
          <button key={c.id} onClick={() => setSel(c.id)}
            className={`px-3.5 py-2 text-xs font-medium border transition-all ${sel === c.id ? "border-[#4cc9f0] text-[#0a1628] bg-[#4cc9f0] font-bold shadow-[0_0_14px_rgba(76,201,240,0.4)]" : "border-[#4cc9f0]/25 text-[#7e9cc4] bg-white/5 hover:border-[#4cc9f0]/60 hover:text-[#dceafc]"}`}>
            {c.name} <span className="opacity-70">· {c.tag}</span>
          </button>
        ))}
        <span className="ml-auto text-[10px] text-[#7e9cc4] tracking-wider">社区数字画像 × 多维指标 · 新增社区后此处可切换</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="人口结构" extra={<span className="text-[10px] text-[#7e9cc4]">群体占比 × 基础指标</span>}>
          <div className="space-y-2.5">
            {p.pop.map((g, i) => (
              <div key={g.g} className="flex items-center gap-2">
                <span className="text-[11px] text-[#7e9cc4] w-20 shrink-0">{g.g}</span>
                <div className="flex-1 h-[9px] rounded-sm bg-[#4cc9f0]/8 overflow-hidden">
                  <div className="h-full rounded-sm bar-fill" style={{
                    width: `${g.r * 2.5}%`,
                    background: `linear-gradient(90deg, ${["#4cc9f0", "#6ee7ff", "#9d7bea", "#5b8def"][i % 4]}66, ${["#4cc9f0", "#6ee7ff", "#9d7bea", "#5b8def"][i % 4]})`,
                    boxShadow: `0 0 8px ${["#4cc9f0", "#6ee7ff", "#9d7bea", "#5b8def"][i % 4]}44`,
                    animationDelay: `${i * 80}ms`,
                  }} />
                </div>
                <span className="text-[11px] num text-[#dceafc] w-10 text-right font-bold"><AnimNum value={`${g.r}%`} delay={i * 80} /></span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-[#4cc9f0]/12 grid grid-cols-3 gap-2 text-center">
            {[[ "总人数", "约1.2万" ], [ "户均", "2.8人" ], [ "老龄化率", "18%" ]].map(([l, v]) => (
              <div key={l}><div className="text-base font-bold num text-[#dceafc]">{v}</div><div className="text-[10px] text-[#7e9cc4]">{l}</div></div>
            ))}
          </div>
        </Panel>

        <Panel title="公共服务设施构成" extra={<span className="text-[10px] text-[#7e9cc4]">五类设施 × 数量</span>}>
          <div className="space-y-2.5">
            {p.service.map((s, i) => {
              const max = Math.max(...p.service.map(x => x.n));
              const c = ["#5b8def", "#4cc9f0", "#6ee7ff", "#9d7bea", "#ffc857"][i % 5];
              return (
                <div key={s.c} className="flex items-center gap-3">
                  <span className="text-[11px] text-[#7e9cc4] w-24 shrink-0">{s.c}</span>
                  <div className="flex-1 h-[9px] rounded-sm bg-[#4cc9f0]/8 overflow-hidden">
                    <div className="h-full rounded-sm bar-fill" style={{
                      width: `${(s.n / max) * 100}%`,
                      background: `linear-gradient(90deg, ${c}66, ${c})`,
                      boxShadow: `0 0 8px ${c}44`,
                      animationDelay: `${i * 80}ms`,
                    }} />
                  </div>
                  <span className="text-[11px] num font-bold w-9 text-right" style={{ color: c }}><AnimNum value={s.n} delay={i * 80} /><span className="text-[9px] font-normal text-[#7e9cc4]">栋</span></span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-[#4cc9f0]/12 flex items-center justify-between text-[11px] text-[#7e9cc4]">
            <span>设施总数 <span className="num text-[#dceafc] font-bold">{p.service.reduce((a, b) => a + b.n, 0)}</span> 栋</span>
            <span>基本公共服务占比 <span className="num text-[#4cc9f0] font-bold">{Math.round(p.service[0].n / p.service.reduce((a, b) => a + b.n, 0) * 100)}%</span></span>
          </div>
        </Panel>

        <Panel title="民生福祉" extra={<span className="text-[10px] text-[#7e9cc4]">满意度 × 核心诉求</span>}>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="border border-[#4cc9f0]/30 bg-[#4cc9f0]/8 p-3.5 text-center relative overflow-hidden">
              <span className="absolute top-2 right-2 opacity-60"><Smile size={14} className="text-[#4cc9f0]" /></span>
              <div className="text-[22px] font-bold num text-[#4cc9f0] glow-cyan">{p.welfare.satisfaction}</div>
              <div className="text-[10px] text-[#7e9cc4] mt-1">满意度指数</div>
            </div>
            <div className="border border-[#4cc9f0]/15 bg-white/[0.02] p-3.5 text-center relative overflow-hidden flex flex-col justify-center">
              <div className="text-[15px] font-bold text-[#b9d2f0] leading-snug">{p.welfare.needs[0].n}</div>
              <div className="text-[10px] text-[#7e9cc4] mt-1">当前第一诉求</div>
            </div>
          </div>
          <div className="text-[11px] font-semibold text-[#b9d2f0] mb-2">核心诉求 TOP5（按相对排序）</div>
          <HBars items={p.welfare.needs} color="#ffc857" hideValue />
        </Panel>

        <Panel title="环境治理" extra={<span className="text-[10px] text-[#7e9cc4]">三项环境指标</span>}>
          <div className="space-y-3 pt-1">
            {p.env.map((e, i) => (
              <div key={e.label} className="flex items-center justify-between py-2.5 px-3 border border-[#4cc9f0]/12 bg-white/[0.02]">
                <span className="text-[11px] text-[#7e9cc4]">{e.label}</span>
                <span className="text-[15px] font-bold num" style={{ color: ["#4cc9f0", "#6ee7ff", "#ffc857"][i % 3] }}>{e.value}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ExperimentPage() {
  const [expId, setExpId] = useState("SP-001");
  const [spView, setSpView] = useState<"single" | "total">("single");
  const exp = EXP_OVERVIEW.find(e => e.id === expId)!;
  return (
    <div className="space-y-4 relative">
      {/* 实验切换：顶部扫描线上方悬浮下拉 */}
      <div className="relative">
        <div className="absolute right-0 -top-12 z-30">
          <select value={expId} onChange={ev => setExpId(ev.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 text-[11px] font-medium rounded-full border border-[#4cc9f0]/30 bg-[#4cc9f0]/[0.08] backdrop-blur-md text-[#dceafc] outline-none cursor-pointer hover:border-[#4cc9f0]/70 hover:bg-[#4cc9f0]/[0.14] transition-colors"
            style={{ backgroundImage: "linear-gradient(45deg, transparent 50%, #4cc9f0 50%), linear-gradient(135deg, #4cc9f0 50%, transparent 50%)", backgroundPosition: "calc(100% - 14px) 55%, calc(100% - 9px) 55%", backgroundSize: "5px 5px", backgroundRepeat: "no-repeat" }}>
            {EXP_OVERVIEW.map(e => (
              <option key={e.id} value={e.id} className="bg-[#0f2342]">{e.id} · {e.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 实验档案 · 生命周期（启动 → 进行中 → 结束归档，等宽步进卡片） */}
      <Panel title="实验档案 · 生命周期" extra={<span className="text-[10px] text-[#7e9cc4]">{exp.id} {exp.name} · {exp.type} · {exp.status}</span>}>
        <div className="pb-0.5">
          <div className="flex items-stretch w-full">
            {(TIMELINE_BY_TYPE[exp.type] ?? []).map((n, i, arr) => {
              const tone = n.active ? "#ffc857" : n.done ? "#4cc9f0" : "#7e9cc4";
              const state = n.active ? "进行中" : n.done ? "已完成" : "待完成";
              return (
                <div key={i} className="contents">
                  <div className={`flex-1 min-w-0 border px-2 sm:px-3.5 py-2.5 ${n.active
                    ? "border-[#ffc857]/45 bg-[#ffc857]/[0.07]"
                    : n.done
                      ? "border-[#4cc9f0]/35 bg-[#4cc9f0]/[0.06]"
                      : "border-[#4cc9f0]/15 bg-white/[0.02]"}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rotate-45 shrink-0 ${n.active ? "bg-[#ffc857] shadow-[0_0_8px_#ffc857] pulse-dot" : n.done ? "bg-[#4cc9f0] shadow-[0_0_8px_#4cc9f0]" : "bg-white/20"}`} />
                      <span className="text-[11px] font-bold truncate min-w-0" style={{ color: tone }}>{n.label}</span>
                      <span className="ml-auto text-[9px] whitespace-nowrap shrink-0 hidden sm:inline" style={{ color: tone, opacity: 0.85 }}>{state}</span>
                    </div>
                    <div className="num text-[10px] text-[#7e9cc4] mt-1.5 truncate">{n.desc}</div>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="flex items-center shrink-0 px-0.5 sm:px-1.5">
                      <span className="h-px w-2 sm:w-4" style={{ background: n.done ? "rgba(76,201,240,0.5)" : "rgba(255,255,255,0.12)" }} />
                      <span className="text-[10px] leading-none hidden sm:inline" style={{ color: n.done ? "#4cc9f0" : "#3a5a80" }}>›</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      {/* ── 结果面板：按实验类型呈现不同内容 ── */}
      {exp.type === "协商博弈" && (
        <>
          {/* 场次视图切换：本场 / 历史汇总 */}
          <div className="flex items-center gap-2 panel px-4 py-2.5 flex-wrap">
            <span className="text-[11px] text-[#7e9cc4]">查看范围</span>
            <div className="flex gap-1.5">
              <button onClick={() => setSpView("single")}
                className={`px-3 py-1.5 text-[11px] font-medium border transition-all ${spView === "single" ? "border-[#4cc9f0] text-[#0a1628] bg-[#4cc9f0] font-bold" : "border-[#4cc9f0]/25 text-[#7e9cc4] bg-white/5 hover:border-[#4cc9f0]/60 hover:text-[#dceafc]"}`}>
                本场实验
              </button>
              <button onClick={() => setSpView("total")}
                className={`px-3 py-1.5 text-[11px] font-medium border transition-all ${spView === "total" ? "border-[#4cc9f0] text-[#0a1628] bg-[#4cc9f0] font-bold" : "border-[#4cc9f0]/25 text-[#7e9cc4] bg-white/5 hover:border-[#4cc9f0]/60 hover:text-[#dceafc]"}`}>
                历史场次汇总
              </button>
            </div>
            <span className="ml-auto text-[10px] text-[#7e9cc4]">
              {spView === "single" ? "当前展示一场实验的完整结果" : "聚合全部已完成场次的跨场次数据"}
            </span>
          </div>

          {spView === "total" ? <SpSessionTotalView /> : (
          <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="逐轮支持率趋势" className="lg:col-span-2"
              extra={<span className="text-[10px] text-[#7e9cc4]">按群体分组 × 6 轮</span>}>
              <LineChart data={SUPPORT_TREND} series={[
                { key: "all", color: "#4cc9f0", label: "全体支持率" },
                { key: "a", color: "#6ee7ff", label: "中青年家庭" },
                { key: "b", color: "#ffc857", label: "老年群体" },
                { key: "c", color: "#9d7bea", label: "新市民" },
                { key: "d", color: "#5b8def", label: "单身青年" },
              ]} />
            </Panel>
            <Panel title="关键指标">
              <div className="grid grid-cols-2 gap-2.5 stagger">
                {[["当前支持率", "64%", "#4cc9f0"], ["议题完成", "75/95", "#6ee7ff"], ["完成轮次", "6/10", "#ffc857"], ["发言条数", "142", "#9d7bea"]].map(([l, v, c], i) => (
                  <div key={l} className="border border-[#4cc9f0]/12 bg-white/[0.02] p-2.5 text-center">
                    <div className="text-lg font-bold num" style={{ color: c }}><AnimNum value={v} delay={i * 90} /></div>
                    <div className="text-[9px] text-[#7e9cc4] mt-0.5">{l}</div>
                  </div>
                ))}
              </div>

            </Panel>
          </div>

          {/* 运行约束提示 */}
          <div className="panel px-4 py-2.5 flex items-center gap-2.5 flex-wrap">
            <span className="w-1.5 h-1.5 rotate-45 bg-[#ffc857] shadow-[0_0_8px_#ffc857] shrink-0" />
            <span className="text-[11px] text-[#ffc857] font-medium">运行模式：单实验独占执行 · 排队启动</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="最新一轮立场分布" className="lg:col-span-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-1">
                {[["同意", 64, "#4cc9f0"], ["中立", 20, "#ffc857"], ["反对", 16, "#ff7a6b"]].map(([n, v, c]) => (
                  <div key={n as string}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-[#7e9cc4]">{n}</span>
                      <span className="text-[11px] num font-bold" style={{ color: c as string }}>{v}%</span>
                    </div>
                    <Bar pct={v as number} color={c as string} h={10} />
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-[#4cc9f0]/15 text-[10px] text-[#7e9cc4] leading-relaxed">
                口径：立场标签由智能体投票时同步提交，按三类统计占比（当前 16 人 / 5 人 / 4 人，共 25 个智能体）；与「候选方案得票」的同意口径一致。该 25 人为实验内执行讨论的智能体，与上方「议题完成 75/95」的真人样本口径不同，二者不重复计入。
              </div>
            </Panel>
          </div>

          {/* 实验前后对比（仅协商博弈，有逐轮数据支撑） */}
          <Panel title="实验前后对比" extra={<span className="text-[10px] text-[#7e9cc4]">第 1 轮基线 → 当前最新一轮</span>}>
            <div className="space-y-3 pt-1">
              {[
                { g: "全体支持率", before: 48, after: 64 },
                { g: "中青年家庭", before: 52, after: 70 },
                { g: "老年群体", before: 40, after: 48 },
                { g: "新市民", before: 45, after: 66 },
                { g: "单身青年", before: 55, after: 70 },
              ].map(r => (
                <div key={r.g} className="flex items-center gap-2">
                  <span className="text-[11px] text-[#7e9cc4] w-20 shrink-0">{r.g}</span>
                  <Bar pct={r.before} color="#7e9cc4" h={7} />
                  <span className="num text-[10px] text-[#7e9cc4] w-8 text-right">{r.before}%</span>
                  <span className="text-[#4cc9f0] text-[10px]">→</span>
                  <Bar pct={r.after} color="#4cc9f0" h={7} />
                  <span className="num text-[10px] font-bold text-[#dceafc] w-8 text-right">{r.after}%</span>
                  <span className="num text-[10px] text-[#ffc857] w-10 text-right">+{r.after - r.before}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-[#4cc9f0]/15 text-[10px] text-[#7e9cc4] leading-relaxed">
              口径：实验前 = 第 1 轮基线，实验后 = 当前最新一轮（全体 +14pp）。注意 SP 无"实验前"的独立观测（第 1 轮是实验开始后的初始轮），且首末轮值已包含在上方逐轮趋势图中，此处为同一指标的重述，如需精简可并入趋势图。
            </div>
          </Panel>
          </>
          )}
        </>
      )}

      {exp.type === "行为决策" && (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Panel title="结果总览 · 真人输入汇总" className="lg:col-span-2">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 stagger">
              {[
                { l: "参与人数", v: "137", c: "#4cc9f0" },
                { l: "有效回收 · 无效 11", v: "126", c: "#6ee7ff" },
                { l: "愿意捐赠", v: "93 人 · 74%", c: "#ffc857" },
                { l: "公益金额合计", v: "¥221.9", c: "#9d7bea" },
              ].map(s => (
                <div key={s.l} className="border border-[#4cc9f0]/15 bg-white/[0.02] p-3 text-center">
                  <div className="text-xl font-bold num" style={{ color: s.c }}><AnimNum value={s.v} /></div>
                  <div className="text-[10px] text-[#7e9cc4] mt-1">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-[#4cc9f0]/15 text-[10px] text-[#7e9cc4] leading-relaxed">
              口径：回收率 = 有效回收 ÷ 目标样本（126 ÷ 137 = 92.0%）；无效样本含重复提交与必填项缺失。捐赠意愿 = 公益金额大于 0 的有效样本占比（74%）；人均捐赠 = 公益金额合计 ÷ 捐赠人数（221.9 ÷ 93 = ¥2.4）。三臂合计与主表一致：52+45+40=137 人、48+41+37=126 份有效、意愿加权 (48×79%+41×78%+37×62%)÷126 ≈ 74%。
            </div>
          </Panel>
          <Panel title="关键结果指标">
            <div className="space-y-3">
              {[["捐赠意愿率", "74%", "#4cc9f0"], ["人均捐赠", "¥2.4", "#ffc857"], ["单笔最高", "¥5.0", "#6ee7ff"], ["回收率", "92.0%", "#9d7bea"]].map(([l, v, c], i) => (
                <div key={l} className="flex items-center justify-between py-2 border-b border-[#4cc9f0]/10 last:border-0">
                  <span className="text-[11px] text-[#7e9cc4]">{l}</span>
                  <span className="text-lg font-bold num" style={{ color: c }}><AnimNum value={v} delay={i * 90} /></span>
                </div>
              ))}
            </div>

          </Panel>
        </div>

        {/* 三子实验横向对照（同一实验内的三个子实验，并行运行） */}
        <Panel title="三子实验横向对照" extra={<span className="text-[10px] text-[#7e9cc4]">三臂随机试验 · 均为实验组</span>}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[760px]">
              <thead>
                <tr className="text-[#7e9cc4] border-b border-[#4cc9f0]/15">
                  {["子实验", "参与 / 有效", "捐赠意愿率", "人均捐赠", "公益金额", "状态"].map(h => (
                    <th key={h} className="text-left py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CW_SUB_EXPS.map(s => {
                  return (
                    <tr key={s.id} className="border-b border-[#4cc9f0]/8 last:border-0 hover:bg-[#4cc9f0]/[0.04] transition-colors">
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 num text-[11px] font-bold border border-[#4cc9f0]/40 text-[#4cc9f0] bg-[#4cc9f0]/8">{s.id}</span>
                        <span className="ml-2 text-[#dceafc] font-medium">{s.name}</span>
                      </td>
                      <td className="py-2.5 num text-[#7e9cc4]">{s.participants} / {s.valid}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="num text-[#ffc857] font-bold w-9">{s.willing}%</span>
                          <div className="w-16"><Bar pct={s.willing} color="#ffc857" h={5} /></div>
                        </div>
                      </td>
                      <td className="py-2.5 num text-[#6ee7ff]">{s.avg}</td>
                      <td className="py-2.5 num text-[#9d7bea]">{s.total}</td>
                      <td className="py-2.5">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold border border-[#4cc9f0]/50 text-[#4cc9f0] bg-[#4cc9f0]/10">
                          <span className="w-1 h-1 rounded-full bg-[#4cc9f0] pulse-dot" />运行中
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 pt-3 border-t border-[#4cc9f0]/15 text-[10px] text-[#7e9cc4] leading-relaxed">
            口径：三个子实验为同一实验内随机分配的三臂（均为干预条件，本实验无对照组），各臂数据由该臂参与者的回传记录聚合。三臂合计与上方主表一致。注意：子实验层级需后台在实验配置中支持「子实验编号 / 名称 / 分组」字段，当前接口就绪前为演示数据。
          </div>
        </Panel>

        {/* 子实验明细已并入上方横向对照表，此处不再重复展示 */}
        </>
      )}

      {exp.type === "意愿采集" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Panel title="结果总览 · 真人输入汇总" className="lg:col-span-2">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 stagger">
              {[
                { l: "参与人数", v: "98", c: "#4cc9f0" },
                { l: "有效回收", v: "89", c: "#6ee7ff" },
                { l: "愿意参保", v: "49 人 · 55%", c: "#ffc857" },
                { l: "记名 / 游客", v: "34 / 55", c: "#9d7bea" },
              ].map(s => (
                <div key={s.l} className="border border-[#4cc9f0]/15 bg-white/[0.02] p-3 text-center">
                  <div className="text-xl font-bold num" style={{ color: s.c }}><AnimNum value={s.v} /></div>
                  <div className="text-[10px] text-[#7e9cc4] mt-1">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="text-[11px] font-semibold text-[#b9d2f0] mb-1.5">参保意愿 · 分层呈现</div>
            <div className="border border-[#4cc9f0]/12 bg-white/[0.02] p-3 mb-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-[#dceafc] font-medium">全样本总体意愿</span>
                <span className="text-[10px] num text-[#7e9cc4]">记名 + 不记名 · 89 份</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-[9px] rounded-sm bg-[#4cc9f0]/8 overflow-hidden">
                  <div className="h-full rounded-sm bar-fill" style={{ width: "55%", background: "linear-gradient(90deg, #4cc9f066, #4cc9f0)", boxShadow: "0 0 8px #4cc9f044" }} />
                </div>
                <span className="num text-[13px] font-bold text-[#4cc9f0] w-11 text-right"><AnimNum value="55%" /></span>
              </div>
            </div>
            <div className="border border-[#ffc857]/20 bg-[#ffc857]/[0.04] p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-[#dceafc] font-medium">群体意愿 · 仅记名居民样本</span>
                <span className="text-[10px] num text-[#ffc857]">居民 34 份 · 游客 55 份不参与分组</span>
              </div>
              <div className="space-y-2">
                {[
                  { n: "中青年家庭", v: 68 },
                  { n: "老年群体", v: 62 },
                  { n: "单身青年", v: 51 },
                  { n: "新市民", v: 31 },
                ].map((r, i) => (
                  <div key={r.n} className="flex items-center gap-2">
                    <span className="text-[10px] text-[#7e9cc4] w-16 shrink-0">{r.n}</span>
                    <div className="flex-1 h-[7px] rounded-sm bg-[#4cc9f0]/8 overflow-hidden">
                      <div className="h-full rounded-sm bar-fill" style={{ width: `${r.v}%`, background: "linear-gradient(90deg, #ffc85766, #ffc857)", animationDelay: `${i * 90}ms` }} />
                    </div>
                    <span className="text-[10px] num font-bold text-[#ffc857] w-9 text-right"><AnimNum value={`${r.v}%`} delay={i * 90} /></span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#4cc9f0]/15 text-[10px] text-[#7e9cc4] leading-relaxed">
              口径：参保意愿比例 = 愿意参保 ÷ 有效回收（49 ÷ 89 = 55%）；回收率 = 89 ÷ 98 = 90.8%。分层：不记名游客仅计入总体意愿，群体维度仅基于记名居民样本（n=34）。保费类指标（意愿保费中位数、可接受保费均值）需后台在问卷中新增保费题并将作答结构化回传，当前暂不呈现。
            </div>
          </Panel>
          <Panel title="关键结果指标">
            <div className="space-y-3">
              {[["参保意愿比例", "55%", "#4cc9f0"], ["有效样本", "89/98", "#6ee7ff"], ["回收率", "90.8%", "#9d7bea"], ["无效样本", "9", "#ff7a6b"]].map(([l, v, c], i) => (
                <div key={l} className="flex items-center justify-between py-2 border-b border-[#4cc9f0]/10 last:border-0">
                  <span className="text-[11px] text-[#7e9cc4]">{l}</span>
                  <span className="text-lg font-bold num" style={{ color: c }}><AnimNum value={v} delay={i * 90} /></span>
                </div>
              ))}
            </div>

          </Panel>
        </div>
      )}
    </div>
  );
}

// ─── SP 协商博弈 · 历史场次汇总（跨场次聚合，SP 类型实验由真人多次发起） ─────────
const SP_SESSIONS = [
  { id: "SS-001", topic: "配送站选址（混合功能区）", initiator: "陈静", rounds: 5, final: 62, passed: true },
  { id: "SS-002", topic: "老年活动室改造", initiator: "王强", rounds: 4, final: 71, passed: true },
  { id: "SS-003", topic: "停车位加装充电桩", initiator: "赵丽", rounds: 5, final: 58, passed: true },
  { id: "SS-004", topic: "中心广场夜市化运营", initiator: "游客11", rounds: 3, final: 44, passed: false },
  { id: "SS-005", topic: "楼道照明智能化改造", initiator: "孙芳", rounds: 4, final: 76, passed: true },
  { id: "SS-006", topic: "屋顶光伏共建方案", initiator: "周建国", rounds: 5, final: 66, passed: true },
  { id: "SS-007", topic: "快递柜迁移至东门", initiator: "游客12", rounds: 3, final: 47, passed: false },
  { id: "SS-008", topic: "儿童活动区扩容", initiator: "刘梅", rounds: 4, final: 69, passed: true },
  { id: "SS-009", topic: "垃圾投放点合并", initiator: "游客13", rounds: 3, final: 52, passed: true },
  { id: "SS-010", topic: "小区主门人车分流", initiator: "陈志远", rounds: 5, final: 73, passed: true },
  { id: "SS-011", topic: "架空层共享工具房", initiator: "游客14", rounds: 4, final: 61, passed: true },
  { id: "SS-012", topic: "宠物活动区划定", initiator: "赵雨萌", rounds: 3, final: 49, passed: false },
];

// 协商博弈按"场次"口径的汇总统计（与实验画像 · 历史场次汇总同口径，总览页共用）
const SP_SESSION_STATS = {
  count: SP_SESSIONS.length,
  passed: SP_SESSIONS.filter(s => s.passed).length,
  passRate: Math.round((SP_SESSIONS.filter(s => s.passed).length / SP_SESSIONS.length) * 100),
  avgFinal: Math.round(SP_SESSIONS.reduce((a, s) => a + s.final, 0) / SP_SESSIONS.length),
  avgRounds: (SP_SESSIONS.reduce((a, s) => a + s.rounds, 0) / SP_SESSIONS.length).toFixed(1),
};

function SpSessionTotalView() {
  const n = SP_SESSIONS.length;
  const passed = SP_SESSIONS.filter(s => s.passed).length;
  const avg = Math.round(SP_SESSIONS.reduce((a, s) => a + s.final, 0) / n);
  const avgRounds = (SP_SESSIONS.reduce((a, s) => a + s.rounds, 0) / n).toFixed(1);
  const buckets = [
    { label: "<50%", test: (v: number) => v < 50 },
    { label: "50–60%", test: (v: number) => v >= 50 && v < 60 },
    { label: "60–70%", test: (v: number) => v >= 60 && v < 70 },
    { label: "≥70%", test: (v: number) => v >= 70 },
  ].map(b => ({ ...b, count: SP_SESSIONS.filter(s => b.test(s.final)).length }));
  const maxBucket = Math.max(...buckets.map(b => b.count));
  const themes = [
    { n: "设施便民类议题", count: 5, pass: "4/5" },
    { n: "空间改造类议题", count: 4, pass: "3/4" },
    { n: "运营管理类议题", count: 3, pass: "2/3" },
  ];

  return (
    <div className="space-y-4">
      <Panel title="协商博弈 · 历史场次汇总" extra={<span className="text-[10px] text-[#7e9cc4]">全部已完成场次 · 跨场次聚合</span>}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
          {[
            { l: "累计场次", v: String(n), c: "#4cc9f0" },
            { l: "议题通过率", v: `${Math.round(passed / n * 100)}%`, sub: `${passed}/${n} 场过半`, c: "#6ee7ff" },
            { l: "平均最终支持率", v: `${avg}%`, c: "#ffc857" },
            { l: "平均讨论轮数", v: avgRounds, sub: "3–5 轮由发起者决定", c: "#9d7bea" },
          ].map(s => (
            <div key={s.l} className="border border-[#4cc9f0]/15 bg-white/[0.02] p-3.5 text-center">
              <div className="text-[26px] leading-none font-bold num glow-cyan" style={{ color: s.c }}>{s.v}</div>
              <div className="text-[10px] text-[#7e9cc4] mt-2">{s.l}{s.sub ? ` · ${s.sub}` : ""}</div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="最终支持率分布" extra={<span className="text-[10px] text-[#7e9cc4]">按场次 · 每场一票</span>}>
          <div className="space-y-3 pt-1">
            {buckets.map((b, i) => (
              <div key={b.label} className="flex items-center gap-3">
                <span className="text-[11px] num text-[#7e9cc4] w-16 shrink-0">{b.label}</span>
                <div className="flex-1 h-[9px] rounded-sm bg-[#4cc9f0]/8 overflow-hidden">
                  <div className="h-full rounded-sm bar-fill" style={{
                    width: `${(b.count / maxBucket) * 100}%`,
                    background: `linear-gradient(90deg, #4cc9f066, ${b.label === "<50%" ? "#ff7a6b" : "#4cc9f0"})`,
                    boxShadow: "0 0 10px #4cc9f055",
                    animationDelay: `${i * 90}ms`,
                  }} />
                </div>
                <span className="num text-[13px] font-bold w-10 text-right" style={{ color: b.label === "<50%" ? "#ff9a8d" : "#4cc9f0" }}><AnimNum value={b.count} delay={i * 90} /><span className="text-[10px] font-normal text-[#7e9cc4]"> 场</span></span>
              </div>
            ))}
          </div>

        </Panel>

        <Panel title="议题类型通过情况">
          <div className="space-y-3.5 pt-1">
            {themes.map(t => (
              <div key={t.n} className="flex items-center justify-between py-2 px-3 border border-[#4cc9f0]/12 bg-white/[0.02]">
                <span className="text-[11px] text-[#dceafc]">{t.n}</span>
                <span className="text-[10px] text-[#7e9cc4]">{t.count} 场 · 通过 <span className="num font-bold text-[#4cc9f0]">{t.pass}</span></span>
              </div>
            ))}
          </div>

        </Panel>
      </div>

      <Panel title="历史场次明细" extra={<span className="text-[10px] text-[#7e9cc4]">{n} 场 · 按时间倒序</span>}>
        <div className="overflow-auto max-h-[280px]">
          <table className="w-full text-xs min-w-[640px]">
            <thead className="sticky top-0 bg-[#0f2342] z-10">
              <tr className="text-[#7e9cc4] border-b border-[#4cc9f0]/15">
                {["场次", "议题", "发起人", "讨论轮数", "最终支持率", "结果"].map(h => <th key={h} className="text-left py-1.5 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {SP_SESSIONS.map(s => (
                <tr key={s.id} className="border-b border-[#4cc9f0]/8 last:border-0 hover:bg-[#4cc9f0]/[0.04] transition-colors">
                  <td className="py-2"><span className="px-1.5 py-0.5 num text-[10px] font-bold border border-[#4cc9f0]/40 text-[#4cc9f0] bg-[#4cc9f0]/8">{s.id}</span></td>
                  <td className="py-2 text-[#dceafc] whitespace-nowrap">{s.topic}</td>
                  <td className="py-2 text-[#7e9cc4] whitespace-nowrap">{s.initiator}</td>
                  <td className="py-2 num text-[#7e9cc4]">{s.rounds} 轮</td>
                  <td className="py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="num font-bold w-9" style={{ color: s.passed ? "#4cc9f0" : "#ff9a8d" }}>{s.final}%</span>
                      <div className="w-16"><Bar pct={s.final} color={s.passed ? "#4cc9f0" : "#ff7a6b"} h={4} /></div>
                    </div>
                  </td>
                  <td className="py-2">
                    <span className={`px-1.5 py-0.5 text-[9px] font-semibold border ${s.passed ? "border-[#4cc9f0]/50 text-[#4cc9f0] bg-[#4cc9f0]/10" : "border-[#ff7a6b]/50 text-[#ff9a8d] bg-[#ff7a6b]/10"}`}>{s.passed ? "通过" : "未过半"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </Panel>
    </div>
  );
}

function AgentPage() {
  const [hoverAgent, setHoverAgent] = useState<AgentRow | null>(null);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Panel title="智能体档案" className="lg:col-span-3"
          extra={<span className="text-[10px] text-[#7e9cc4]">按贡献度排序 · 滚动查看全部 25 人</span>}>
          <div className="overflow-auto max-h-[336px] scroll-smooth">
          <table className="w-full text-xs min-w-[760px]">
            <thead className="sticky top-0 bg-[#0f2342] z-10">
              <tr className="text-[#7e9cc4] border-b border-[#4cc9f0]/15">
                {["编号", "姓名", "性别", "年龄", "职业", "户籍", "群体", "角色", "满意度", "说服敏感度", "贡献度"].map(h => <th key={h} className="text-left py-1.5 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {AGENTS.map(a => (
                <tr key={a.code}
                  onMouseEnter={() => setHoverAgent(a)}
                  className={`border-b border-[#4cc9f0]/8 last:border-0 cursor-pointer transition-colors ${hoverAgent?.code === a.code ? "bg-[#4cc9f0]/[0.08]" : "hover:bg-[#4cc9f0]/[0.04]"}`}>
                  <td className="py-1.5">
                    <span className="px-1.5 py-0.5 num text-[10px] font-bold border border-[#4cc9f0]/40 text-[#4cc9f0] bg-[#4cc9f0]/8">{a.code}</span>
                  </td>
                  <td className="py-1.5 font-medium text-[#dceafc] whitespace-nowrap">{a.name}</td>
                  <td className="py-1.5 text-[#7e9cc4]">{a.gender}</td>
                  <td className="py-1.5 num text-[#7e9cc4]">{a.age}</td>
                  <td className="py-1.5 text-[#7e9cc4] whitespace-nowrap">{a.job}</td>
                  <td className="py-1.5 text-[#7e9cc4] whitespace-nowrap">{a.hukou}</td>
                  <td className="py-1.5 text-[#7e9cc4] whitespace-nowrap">{a.group}</td>
                  <td className="py-1.5">
                    <span className={`px-1 py-0.5 text-[9px] font-semibold border whitespace-nowrap ${a.role === "代表" ? "border-[#ffc857]/50 text-[#ffc857] bg-[#ffc857]/8" : "border-[#4cc9f0]/30 text-[#b9d2f0] bg-white/[0.03]"}`}>{a.role}</span>
                  </td>
                  <td className="py-1.5 num" style={{ color: a.satisfaction >= 70 ? "#4cc9f0" : a.satisfaction >= 55 ? "#b9d2f0" : "#ff9a8d" }}>{a.satisfaction}</td>
                  <td className="py-1.5 num text-[#7e9cc4]">{a.persuasion.toFixed(2)}</td>
                  <td className="py-1.5">
                    <div className="flex items-center gap-1">
                      <span className="num w-6 text-[#dceafc] font-bold text-[11px]">{a.contribution}</span>
                      <div className="w-10"><Bar pct={a.contribution} color="#ffc857" h={4} /></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="mt-2 pt-2 border-t border-[#4cc9f0]/12 text-[9px] text-[#7e9cc4] leading-snug">
            转化口径：基本属性 / 个人画像 / 仿真参数（含群体、说服敏感度、角色）来自智能体配置；贡献度 = 发言贡献 × 50% + 投票参与 × 50%（两项归一化后加权，来自回传记录）。原口径中的"互动影响"（发言被附议/回复次数）需后台从发言记录抽取互动关系，字段就绪前不计入，故权重由 30/30/40 调整为 50/50。资源获取需回传资源字段，当前不呈现。
          </div>
        </Panel>

        <Panel title="智能体动态 · 互动网络" className="lg:col-span-2"
          extra={<span className="flex items-center gap-1 text-[10px] text-[#7e9cc4]"><Network size={11} />青=友好 灰=中立 红=对立</span>}>
          <div className="relative">
            <NetworkGraph highlight={hoverAgent?.code ?? null} />
          </div>
          <div className="text-[9px] text-[#7e9cc4] text-center mt-1">25 人 × 38 条有向关系 · 悬停左侧档案可在网络中定位该智能体</div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="满意度追踪 · SP-001 逐轮（智能体实验体系）"
          extra={<span className="text-[10px] text-[#7e9cc4]">主观感受</span>}>
          <LineChart data={AGENT_SATISFACTION_TREND} height={132} series={[
            { key: "A", color: "#4cc9f0", label: "中青年家庭" },
            { key: "B", color: "#ffc857", label: "老年群体" },
            { key: "C", color: "#9d7bea", label: "新市民" },
            { key: "D", color: "#5b8def", label: "单身青年" },
          ]} />
          <div className="mt-2 text-[9px] text-[#7e9cc4] leading-snug">
            口径：逐轮满意度应由智能体每轮博弈结束后的评价聚合后回传；当前为演示数据（智能体档案中的"满意度"仅为配置期静态设定值，不是过程结果）。获得感字段尚未定义，需先落为可回传的量化字段。
          </div>
        </Panel>
        <Panel title="行为模式 · 立场演变"
          extra={<span className="text-[10px] text-[#7e9cc4]">SP-001 逐轮支持率</span>}>
          <LineChart data={SUPPORT_TREND} height={132} series={[
            { key: "a", color: "#4cc9f0", label: "中青年家庭支持率" },
            { key: "b", color: "#ffc857", label: "老年群体支持率" },
          ]} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="px-2 py-0.5 text-[10px] border border-[#ffc857]/50 text-[#ffc857] bg-[#ffc857]/8">老年群体 · 立场坚定型</span>
            <span className="px-2 py-0.5 text-[10px] border border-[#4cc9f0]/40 text-[#4cc9f0] bg-[#4cc9f0]/8">新市民 · 可说服型</span>
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ─── AI 报告生成器（模拟流式生成，实际由后台聚合数据 + 大模型叙述产出） ──────────
const AI_REPORTS: Record<string, { steps: string[]; sections: { title: string; body: string }[] }> = {
  "SP-001": {
    steps: ["读取实验配置与参与记录", "聚合 6 轮支持率与立场分布", "汇总预警记录", "生成结论与建议"],
    sections: [
      { title: "实验概况", body: "SP-001 公共设施选址协商于杨柳郡开展，真人目标样本 95 人、议题完成 75 人；实验内由 25 个智能体完成 6 轮讨论，累计发言 142 条。" },
      { title: "关键发现", body: "支持率从首轮 48% 稳步升至当前 64%，各群体均呈正向变化；其中新市民群体升幅最大（+21pp），老年群体仅 +8pp 为主要阻力。" },
      { title: "异常与预警", body: "单身青年群体连续 2 轮支持率波动超过 15%，提示立场尚未稳定，建议关注下一轮走向。" },
      { title: "结论与建议", body: "混合功能区方案已获过半支持，建议：①对老年群体补充噪音治理承诺以巩固支持；②保持当前引导策略至收官，避免议程外话题扰动。" },
    ],
  },
  "CW-001": {
    steps: ["读取行为决策记录", "汇总 126 份有效样本", "计算捐赠意愿与金额分布", "生成结论与建议"],
    sections: [
      { title: "实验概况", body: "CW-001 一瓶水的故事于杨柳郡开展，137 人参与、126 份有效回收（92.0%），公益金额合计 ¥221.9；实验内含 CW-0001 爱心溢价效应、CW-0002 爱心撬动效应、CW-0003 爱心锚定效应三个子实验，参与者随机分配。" },
      { title: "关键发现", body: "捐赠意愿率 74%，人均捐赠 ¥2.4；三臂中「CW-0001 爱心溢价效应」捐赠意愿最高（79%），「CW-0003 爱心锚定效应」最低（62%），信息呈现方式对利他行为影响显著。" },
      { title: "异常与预警", body: "今日回传量较昨日下降 8%，接近预警阈值，建议关注参与节奏。" },
      { title: "结论与建议", body: "公益告知语是低成本高有效的干预手段，建议后续实验固定保留；可进一步测试告知语措辞强度对意愿的边际影响。" },
    ],
  },
  "YL-002": {
    steps: ["读取问卷回收数据", "分层统计记名样本", "核对预警记录", "生成结论与建议"],
    sections: [
      { title: "实验概况", body: "YL-002 益联保参保意愿于杨柳郡开展，98 人参与、89 份有效回收（90.8%），愿意参保 49 人。" },
      { title: "关键发现", body: "总体参保意愿 55%；记名居民样本中中青年家庭（68%）与老年群体（62%）意愿较高，新市民仅 31%，为主要短板。" },
      { title: "异常与预警", body: "新市民群体意愿低于全体均值 24 个百分点，已触发群体偏差预警（n=34 小样本，需谨慎解读）。" },
      { title: "结论与建议", body: "户籍限制与异地就医顾虑是新市民参保意愿低的主因，建议：①推送面向流动人口的参保政策解读；②在异地结算便利性上做针对性宣传。" },
    ],
  },
};

function ReportGenerator() {
  const [expId, setExpId] = useState("SP-001");
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [stepIdx, setStepIdx] = useState(0);
  const report = AI_REPORTS[expId];

  const generate = () => {
    setPhase("running");
    setStepIdx(0);
    let i = 0;
    const tick = () => {
      i += 1;
      if (i < report.steps.length) {
        setStepIdx(i);
        setTimeout(tick, 700);
      } else {
        setStepIdx(i);
        setTimeout(() => setPhase("done"), 500);
      }
    };
    setTimeout(tick, 700);
  };

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <select value={expId} onChange={e => { setExpId(e.target.value); setPhase("idle"); }}
          className="flex-1 px-2.5 py-2 text-xs border border-[#4cc9f0]/25 outline-none bg-[#0f2342] text-[#dceafc]">
          {EXP_OVERVIEW.map(e => <option key={e.id} value={e.id}>{e.id} · {e.name}</option>)}
        </select>
        <button onClick={generate} disabled={phase === "running"}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#0a1628] bg-[#4cc9f0] hover:bg-[#7ddcff] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_14px_rgba(76,201,240,0.35)]">
          <FileText size={13} />{phase === "running" ? "生成中…" : "AI 生成报告"}
        </button>
      </div>

      {phase === "running" && (
        <div className="border border-[#4cc9f0]/20 bg-white/[0.02] p-3 space-y-1.5">
          {report.steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 text-[11px]">
              {i < stepIdx ? (
                <span className="num text-[#4cc9f0]">✓</span>
              ) : i === stepIdx ? (
                <span className="w-1.5 h-1.5 rounded-full bg-[#4cc9f0] pulse-dot" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-white/15" />
              )}
              <span style={{ color: i <= stepIdx ? "#b9d2f0" : "#7e9cc4" }}>{s}</span>
            </div>
          ))}
        </div>
      )}

      {phase === "done" && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-[10px] text-[#4cc9f0]">
            <span className="num">✓</span>报告生成完成
            <button className="ml-auto px-2.5 py-1 text-[10px] border border-[#ffc857]/40 text-[#ffc857] hover:bg-[#ffc857]/15 transition-colors">导出报告</button>
          </div>
          {report.sections.map(s => (
            <div key={s.title} className="border border-[#4cc9f0]/15 bg-white/[0.02] p-3">
              <div className="text-[11px] font-bold text-[#4cc9f0] mb-1 flex items-center gap-1.5">
                <span className="w-1 h-1 rotate-45 bg-[#4cc9f0] shadow-[0_0_6px_#4cc9f0]" />{s.title}
              </div>
              <div className="text-[11px] text-[#b9d2f0] leading-relaxed">{s.body}</div>
            </div>
          ))}
        </div>
      )}

      {phase === "idle" && (
        <div className="border border-dashed border-[#4cc9f0]/20 p-4 text-[11px] text-[#7e9cc4] text-center">
          选择实验后点击「AI 生成报告」
        </div>
      )}
    </div>
  );
}

function InsightPage() {
  return (
    <div className="space-y-4">
      <Panel title="异常预警与提示"
        extra={<span className="text-[10px] text-[#7e9cc4]">规则：群体偏差 &gt;20pp · 相邻轮波动 &gt;15pp · 回传量下降</span>}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {ALERTS.map((a, i) => (
            <div key={i} className={`relative border p-3.5 ${a.level === "预警" ? "border-[#ff7a6b]/35 bg-[#ff7a6b]/8" : "border-[#ffc857]/25 bg-[#ffc857]/6"}`}>
              <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${a.level === "预警" ? "bg-[#ff7a6b]" : "bg-[#ffc857]"}`}
                style={{ boxShadow: `0 0 8px ${a.level === "预警" ? "#ff7a6b" : "#ffc857"}` }} />
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={15} className={a.level === "预警" ? "text-[#ff7a6b] flex-shrink-0 mt-0.5" : "text-[#ffc857] flex-shrink-0 mt-0.5"} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold" style={{ color: a.level === "预警" ? "#ff9a8d" : "#ffc857" }}>
                      <span className="num mr-2">{a.exp}</span>{a.level}
                    </div>
                    <span className="text-[10px] num text-[#7e9cc4]">{a.time}</span>
                  </div>
                  <div className="text-[11px] text-[#b9d2f0] mt-1.5 leading-relaxed">{a.text}</div>
                  <button className={`mt-2.5 text-[10px] px-2.5 py-1 border transition-colors ${a.level === "预警" ? "border-[#ff7a6b]/40 text-[#ff9a8d] hover:bg-[#ff7a6b]/15" : "border-[#4cc9f0]/35 text-[#7e9cc4] hover:text-[#4cc9f0] hover:border-[#4cc9f0]/70"}`}>处理</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-[#4cc9f0]/12 text-[10px] text-[#7e9cc4] leading-relaxed">
          转化口径：三条规则分别由回传字段直接计算——群体偏差 = 某群体核心指标与全体均值之差；相邻轮波动 = 相邻两轮支持率之差；回传量下降 = 当日回传条数环比。另有一条"参与率低于阈值"（实到人数 ÷ 目标样本数 &lt; 80%）待后台提供"目标样本数"字段后启用。预警由后台按固定规则扫描产出并回写处理状态。
        </div>
      </Panel>

      <Panel title="实验分析报告 · AI 一键生成"
        extra={<span className="text-[10px] text-[#7e9cc4]">数据聚合 × AI 叙述生成</span>}>
        <ReportGenerator />
      </Panel>
    </div>
  );
}

// ─── 主框架：驾驶舱指挥台 ─────────────────────────────────────────────────────
const NAV = [
  { id: "overview", label: "总览", icon: Activity },
  { id: "community", label: "社区画像", icon: Building2 },
  { id: "experiment", label: "实验画像", icon: FlaskConical },
  { id: "agent", label: "智能体", icon: Bot },
  { id: "insight", label: "洞察", icon: BarChart3 },
];

export default function Dashboard() {
  const [tab, setTab] = useState("overview");
  // 顶部时钟：每秒走字，营造"实时运行中"的观感
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const p2 = (n: number) => String(n).padStart(2, "0");
  const clockDate = `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}`;
  const clockTime = `${p2(now.getHours())}:${p2(now.getMinutes())}:${p2(now.getSeconds())}`;
  const page = useMemo(() => {
    switch (tab) {
      case "community": return <CommunityPage />;
      case "experiment": return <ExperimentPage />;
      case "agent": return <AgentPage />;
      case "insight": return <InsightPage />;
      default: return <OverviewPage />;
    }
  }, [tab]);

  return (
    <div className="min-h-screen cockpit-bg relative">
      <div className="absolute inset-0 cockpit-grid pointer-events-none" />
      <div className="relative flex flex-col min-h-screen">
        {/* 顶部指挥栏 */}
        <header className="relative overflow-hidden border-b border-[#4cc9f0]/20 bg-[#0a1628]/70 backdrop-blur-md">
          <div className="absolute bottom-0 left-0 right-0 scanline" />
          <div className="flex items-center justify-between px-4 sm:px-6 pt-3">
            {/* 左：日期时间 */}
            <div className="text-[11px] num text-[#7e9cc4] w-44 hidden md:block">
              {clockDate} <span className="text-[#4cc9f0]">{clockTime}</span>
            </div>
            {/* 中：主标题 */}
            <div className="text-center mx-auto md:mx-0">
              <h1 className="text-base sm:text-lg font-bold tracking-[0.35em] title-grad pl-[0.35em]">
                共同富裕感知实验驾驶舱
              </h1>
              <div className="hidden sm:flex items-center justify-center gap-2 mt-1">
                <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#4cc9f0]/70" />
                <span className="text-[9px] tracking-[0.4em] text-[#4cc9f0]/80 pl-[0.4em]">COMMON PROSPERITY · PERCEPTION LAB</span>
                <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#4cc9f0]/70" />
              </div>
            </div>
            {/* 右：状态 */}
            <div className="hidden md:flex items-center justify-end gap-2 w-44">
              <span className="flex items-center gap-1 px-2 py-0.5 border border-[#4cc9f0]/40 bg-[#4cc9f0]/10 text-[#4cc9f0] text-[10px] badge-live">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4cc9f0] pulse-dot" />数据同步中
              </span>
            </div>
          </div>
          {/* 导航：居中航班式 */}
          <nav className="flex items-center justify-center gap-1 py-2.5 px-2 flex-wrap">
            {NAV.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)}
                className={`flex items-center gap-1.5 px-5 py-1.5 text-[12px] tracking-wider transition-all clip-nav ${tab === n.id
                  ? "text-[#0a1628] font-bold bg-[#4cc9f0] shadow-[0_0_16px_rgba(76,201,240,0.45)]"
                  : "text-[#7e9cc4] border border-[#4cc9f0]/20 hover:text-[#dceafc] hover:border-[#4cc9f0]/60"}`}>
                <n.icon size={13} />{n.label}
              </button>
            ))}
          </nav>
        </header>

        {/* 主区 */}
        <main className="flex-1 p-3 sm:p-5 relative">
          <div key={tab} className="demo-page-enter max-w-[1500px] mx-auto space-y-0">{page}</div>
        </main>
      </div>
    </div>
  );
}
