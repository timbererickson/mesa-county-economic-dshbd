import { Users, Briefcase, HeartHandshake, ExternalLink, ArrowUpRight, TrendingUp, ShieldCheck } from 'lucide-react'

const DASHBOARD_URL = 'https://datastudio.google.com/reporting/f77ba076-33ff-48a6-8c7e-daa4f109aabb/page/p_wjyvj9dckd'

export default function HumanServicesCallout() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#045975] bg-[#023e52] shadow-xl text-white">
      {/* Background ambient accents */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left Info Column */}
        <div className="space-y-3 max-w-3xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs font-bold tracking-wide uppercase">
              <HeartHandshake className="w-3.5 h-3.5 text-cyan-300" />
              Mesa County Workforce Center
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-gray-200 text-xs font-semibold">
              <TrendingUp className="w-3.5 h-3.5 text-amber-300" />
              Department of Human Services
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug">
            Workforce Center Dashboard
          </h3>

          <p className="text-xs sm:text-sm text-gray-200/90 leading-relaxed">
            Explore deeper socioeconomic datasets compiled by the Mesa County Department of Human Services, featuring labor force participation rates, wage distributions, unemployment statistics, and support program metrics.
          </p>

          {/* Feature Highlights Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-cyan-100 bg-[#012531] px-3 py-1 rounded-lg border border-[#045975]">
              <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
              <span>Labor & Workforce Trends</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-cyan-100 bg-[#012531] px-3 py-1 rounded-lg border border-[#045975]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Assistance & Support Programs</span>
            </div>
          </div>
        </div>

        {/* Right Action Button Column */}
        <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto">
          <a
            href={DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-[#023e52] font-bold text-sm hover:bg-gray-100 transition-all shadow-lg hover:shadow-cyan-500/20 active:scale-[0.98] group"
          >
            <span>Launch Workforce Dashboard</span>
            <ExternalLink className="w-4 h-4 text-[#023e52] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
          <span className="text-[11px] text-gray-300 text-center lg:text-right flex items-center justify-center lg:justify-end gap-1">
            <span>Powered by Google Looker Studio</span>
            <ArrowUpRight className="w-3 h-3 text-cyan-300" />
          </span>
        </div>
      </div>
    </div>
  )
}
