import React from 'react';

/**
 * Standardized DYPIU Background Watermark Component.
 * Renders the official transparent monochrome DYPIU logo watermark
 * in the background whitespace on the right side of public pages.
 */
function DYPIUWatermark({ top = '15px', right, width = '340px', opacity = 0.10 }) {
  return (
    <img
      src="/logobw1.png"
      alt=""
      className="dypiu-page-watermark-img"
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: top,
        right: right || 'max(20px, calc(50% - 660px))',
        width: width,
        maxWidth: '25vw',
        height: 'auto',
        opacity: opacity,
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        outline: 'none',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 0,
        filter: 'brightness(0)'
      }}
    />
  );
}

export default DYPIUWatermark;
