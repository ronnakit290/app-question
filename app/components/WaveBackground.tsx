/**
 * พื้นหลังคลื่นน้ำสีน้ำเงิน — SVG ล้วน ไม่มี state, render ครั้งเดียว
 * วางไว้หลังทุกอย่างด้วย fixed + -z-10
 */
export default function WaveBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* ไล่สีพื้น: ขาวนวลด้านบน → ฟ้าอ่อนด้านล่าง */}
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#f6f9fd" />
            <stop offset="100%" stopColor="#eaf2fb" />
          </linearGradient>

          <linearGradient id="w1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#dbe9fa" />
            <stop offset="100%" stopColor="#c7dcf5" />
          </linearGradient>
          <linearGradient id="w2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#b8d2f2" />
            <stop offset="100%" stopColor="#9dc0ea" />
          </linearGradient>
          <linearGradient id="w3" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6f9fd8" />
            <stop offset="55%" stopColor="#4f83c4" />
            <stop offset="100%" stopColor="#2f5f9e" />
          </linearGradient>
          <linearGradient id="w4" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1f4a80" />
            <stop offset="100%" stopColor="#12365f" />
          </linearGradient>

          {/* ประกายทองบางๆ ตัดขอบคลื่น */}
          <linearGradient id="gild" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(176,141,79,0)" />
            <stop offset="45%" stopColor="rgba(176,141,79,0.55)" />
            <stop offset="100%" stopColor="rgba(176,141,79,0)" />
          </linearGradient>

          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>

        <rect width="1440" height="900" fill="url(#sky)" />

        {/* แสงนวลกลางจอ */}
        <ellipse
          cx="720"
          cy="180"
          rx="620"
          ry="220"
          fill="#ffffff"
          opacity="0.85"
          filter="url(#soft)"
        />

        {/* ชั้นคลื่น — ยิ่งล่างยิ่งเข้ม */}
        <g className="wave wave-1">
          <path
            d="M-200 620 C 60 560, 220 690, 480 640 S 900 540, 1160 610 S 1520 690, 1740 630 L1740 900 L-200 900 Z"
            fill="url(#w1)"
            opacity="0.9"
          />
        </g>

        <g className="wave wave-2">
          <path
            d="M-200 700 C 80 640, 260 770, 520 720 S 940 620, 1180 692 S 1540 762, 1740 706 L1740 900 L-200 900 Z"
            fill="url(#w2)"
            opacity="0.85"
          />
        </g>

        <g className="wave wave-3">
          <path
            d="M-200 780 C 100 726, 300 846, 560 800 S 980 712, 1220 776 S 1560 838, 1740 790 L1740 900 L-200 900 Z"
            fill="url(#w3)"
            opacity="0.92"
          />
          <path
            d="M-200 780 C 100 726, 300 846, 560 800 S 980 712, 1220 776 S 1560 838, 1740 790"
            fill="none"
            stroke="url(#gild)"
            strokeWidth="1.5"
          />
        </g>

        <g className="wave wave-4">
          <path
            d="M-200 852 C 140 812, 320 900, 600 862 S 1000 792, 1240 846 S 1560 890, 1740 856 L1740 900 L-200 900 Z"
            fill="url(#w4)"
          />
        </g>

        {/* ประกายผิวน้ำ */}
        <g opacity="0.5">
          <path
            d="M240 742 q 60 -14 120 0"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            opacity="0.5"
          />
          <path
            d="M880 726 q 50 -12 100 0"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            opacity="0.35"
          />
          <path
            d="M1180 812 q 70 -16 140 0"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            opacity="0.3"
          />
        </g>
      </svg>
    </div>
  );
}
