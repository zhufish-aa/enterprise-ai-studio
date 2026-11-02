/** Decorative vector artwork. No remote assets, animation or additional runtime. */
export function AuthenticationArt() {
  return (
    <svg className="account-art" viewBox="0 0 560 540" fill="none" aria-hidden="true">
      <defs>
        <linearGradient
          id="auth-top"
          x1="170"
          y1="150"
          x2="420"
          y2="320"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff" />
          <stop offset="1" stopColor="#e5edfc" />
        </linearGradient>
        <linearGradient
          id="auth-left"
          x1="175"
          y1="220"
          x2="290"
          y2="420"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff" />
          <stop offset="1" stopColor="#e7eef9" />
        </linearGradient>
        <linearGradient
          id="auth-right"
          x1="415"
          y1="220"
          x2="292"
          y2="410"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#d4e1fa" />
          <stop offset="1" stopColor="#9ab6e9" />
        </linearGradient>
        <linearGradient
          id="auth-blue"
          x1="252"
          y1="181"
          x2="331"
          y2="302"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#8eacf0" />
          <stop offset="1" stopColor="#567ad2" />
        </linearGradient>
        <linearGradient
          id="auth-side"
          x1="300"
          y1="324"
          x2="453"
          y2="406"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#dbe6f6" />
          <stop offset="1" stopColor="#b9cce8" />
        </linearGradient>
        <linearGradient
          id="auth-glass"
          x1="150"
          y1="180"
          x2="425"
          y2="350"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff" stopOpacity=".85" />
          <stop offset="1" stopColor="#dbe7fc" stopOpacity=".6" />
        </linearGradient>
        <radialGradient id="auth-halo">
          <stop stopColor="#c4d5f4" stopOpacity=".65" />
          <stop offset="1" stopColor="#dce6f6" stopOpacity="0" />
        </radialGradient>
        <filter id="auth-shadow" x="-50%" y="-100%" width="200%" height="300%">
          <feGaussianBlur stdDeviation="13" />
        </filter>
        <filter id="auth-small-shadow" x="-60%" y="-70%" width="220%" height="240%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      <ellipse cx="286" cy="282" rx="238" ry="225" fill="url(#auth-halo)" />
      <g stroke="#d7e1ef" strokeWidth=".8" opacity=".55">
        <path d="m24 350 250-145 266 154M24 393l250-145 266 154M24 436l250-145 266 154M88 474l186-108 202 117M26 436l266-154 246 142M26 393l266-154 246 142M26 350l266-154 246 142" />
      </g>
      <ellipse
        cx="291"
        cy="416"
        rx="152"
        ry="30"
        fill="#728cba"
        opacity=".17"
        filter="url(#auth-shadow)"
      />
      <path d="m132 360 160-92 160 92v19l-160 92-160-92z" fill="url(#auth-side)" stroke="#bacce7" />
      <path
        d="m132 360 160-92 160 92-160 92z"
        fill="url(#auth-top)"
        stroke="#fff"
        strokeWidth="1.5"
      />
      <path d="m292 452 160-92v19l-160 92z" fill="#cedcf0" />
      <path d="m153 360 139-80 139 80-139 80z" stroke="#d2def0" />
      <path d="m182 237 110 64v111l-110-64z" fill="url(#auth-left)" stroke="#e2e9f4" />
      <path d="m402 237-110 64v111l110-64z" fill="url(#auth-right)" stroke="#bfd0ed" />
      <path
        d="m182 237 110-64 110 64-110 64z"
        fill="url(#auth-top)"
        stroke="#fff"
        strokeWidth="1.5"
      />
      <path d="m204 237 88-51 88 51-88 51z" fill="#e4ecfb" stroke="#c7d6ef" />
      <path d="m237 215 55 32 55-32v58l-55 32-55-32z" fill="url(#auth-blue)" />
      <path d="m237 215 55-32 55 32-55 32z" fill="#b0c6f7" stroke="#c6d6f7" />
      <path d="m292 247 55-32v58l-55 32z" fill="#5678cd" opacity=".55" />
      <path d="m182 237 110 64v111" stroke="#fff" strokeOpacity=".9" strokeWidth="1.5" />
      <path d="m292 323 110-64M292 386l110-64" stroke="#e6efff" strokeOpacity=".7" />
      <path
        d="m181 196 111-64 111 64v18l-111 64-111-64z"
        fill="url(#auth-glass)"
        stroke="#f7faff"
        strokeWidth="1.2"
      />
      <path
        d="m181 196 111-64 111 64-111 64z"
        fill="url(#auth-glass)"
        stroke="#fff"
        strokeWidth="1.4"
      />
      <path d="m203 196 89-51 89 51-89 51z" stroke="#cad9f3" />
      <path d="m292 260 111-64v18l-111 64z" fill="#c0d2f2" fillOpacity=".4" />
      <path d="m211 198 81 47 81-47" stroke="#fff" strokeOpacity=".9" />
      <ellipse
        cx="132"
        cy="269"
        rx="39"
        ry="12"
        fill="#8ba4cd"
        opacity=".16"
        filter="url(#auth-small-shadow)"
      />
      <path d="m100 205 32-19 32 19v42l-32 19-32-19z" fill="#e8effb" stroke="#c9d7eb" />
      <path d="m100 205 32-19 32 19-32 19z" fill="#fff" stroke="#e2eaf6" />
      <path d="m132 224 32-19v42l-32 19z" fill="#cfddf4" />
      <path d="m100 205 32 19v42" stroke="#fff" strokeWidth="1.2" />
      <path d="m164 224 18 10" stroke="#afc4e7" strokeDasharray="3 5" />
      <ellipse
        cx="425"
        cy="177"
        rx="29"
        ry="10"
        fill="#8ba4cd"
        opacity=".16"
        filter="url(#auth-small-shadow)"
      />
      <path d="m400 127 25-14 25 14v32l-25 15-25-15z" fill="#dbe6f8" stroke="#c4d4ec" />
      <path d="m400 127 25-14 25 14-25 15z" fill="#fff" stroke="#e2eaf6" />
      <path d="m425 142 25-15v32l-25 15z" fill="#b7ccef" />
      <path d="m400 127 25 15v32" stroke="#fff" strokeWidth="1.2" />
      <path d="m400 159-24 14" stroke="#afc4e7" strokeDasharray="3 5" />
      <circle cx="171" cy="134" r="5" fill="#91ace1" />
      <circle cx="171" cy="134" r="12" stroke="#cbd9f0" />
      <circle cx="447" cy="329" r="4" fill="#9db5e2" />
      <circle cx="447" cy="329" r="10" stroke="#d3dff1" />
      <path
        d="M144 333h8m-4-4v8M364 99h8m-4-4v8"
        stroke="#a9bcdb"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
