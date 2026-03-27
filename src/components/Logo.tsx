import React from 'react';

export default function Logo({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 500 350" 
      className={className}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Mountain Triangles */}
      <path d="M50 200 L180 50 L310 200" stroke="#4B0082" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M150 200 L280 50 L410 200" stroke="#3CB371" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M250 200 L380 50 L510 200" stroke="#FFD700" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* Small House Square */}
      <rect x="155" y="145" width="25" height="25" fill="#3CB371" />
      <rect x="180" y="145" width="25" height="25" fill="#FF0000" />
      <rect x="155" y="170" width="25" height="25" fill="#0000FF" />
      <rect x="180" y="170" width="25" height="25" fill="#FFD700" />
      
      {/* Text THIÊN ÂN */}
      <text 
        x="250" 
        y="280" 
        textAnchor="middle" 
        fill="#FF0000" 
        style={{ fontSize: '70px', fontWeight: '900', fontFamily: 'sans-serif' }}
      >
        THIÊN ÂN
      </text>
      
      {/* Text TECHNOLOGY */}
      <text 
        x="250" 
        y="330" 
        textAnchor="middle" 
        fill="#000000" 
        style={{ fontSize: '30px', fontWeight: 'bold', fontFamily: 'sans-serif', letterSpacing: '8px' }}
      >
        TECHNOLOGY
      </text>
    </svg>
  );
}
