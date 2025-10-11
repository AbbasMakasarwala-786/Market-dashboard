import { Cormorant_Infant } from 'next/font/google';
import { useEffect,useRef } from 'react'
import React from 'react'

const useTradingWidget = (scriptUrl:string,config:Record<string,unknown>,height = 600) => {
    const containerRef = useRef<HTMLDivElement | null>(null)
    useEffect(
        () => {
        if (!containerRef.current)
            {
                return ;
            };
        if(containerRef.current.dataset.loaded){
            return ;
        } 
        containerRef.current.innerHTML = `<div class="tradingview-widget-container__widget_style="width:100%; height:${height}px;"></div> `;


          const script = document.createElement("script");
          script.src = scriptUrl;
          script.async = true;
          script.innerHTML = JSON.stringify(config);
          containerRef.current.appendChild(script)
          containerRef.current.dataset.loaded ='true'
        
            return () =>{
                if (containerRef.current){
                    containerRef.current.innerHTML ='';
                    delete containerRef.current.dataset.loaded;
                }
            }

        },

        [scriptUrl,config,height]
      );
  return (
    containerRef
  )
}

export default useTradingWidget














// // TradingViewWidget.jsx
// import React, { useEffect, useRef, memo } from 'react';

// function TradingViewWidget() {
//   const container = useRef();

//   useEffect(
//     () => {
//       const script = document.createElement("script");
//       script.src = "https://s3.tradingview.com/external-embedding/embed-widget-hotlists.js";
//       script.type = "text/javascript";
//       script.async = true;
//       script.innerHTML = `
//         {
//           "exchange": "BSE",
//           "colorTheme": "dark",
//           "dateRange": "1M",
//           "showChart": true,
//           "locale": "en",
//           "largeChartUrl": "",
//           "isTransparent": false,
//           "showSymbolLogo": false,
//           "showFloatingTooltip": false,
//           "plotLineColorGrowing": "rgba(27, 94, 32, 1)",
//           "plotLineColorFalling": "rgba(128, 25, 34, 1)",
//           "gridLineColor": "rgba(240, 243, 250, 0)",
//           "scaleFontColor": "#DBDBDB",
//           "belowLineFillColorGrowing": "rgba(0, 51, 42, 0.12)",
//           "belowLineFillColorFalling": "rgba(128, 25, 34, 0)",
//           "belowLineFillColorGrowingBottom": "rgba(102, 187, 106, 0)",
//           "belowLineFillColorFallingBottom": "rgba(247, 82, 95, 0)",
//           "symbolActiveColor": "rgba(41, 98, 255, 0.12)",
//           "width": "100%",
//           "height": "100%"
//         }`;
//       container.current.appendChild(script);
//     },
//     []
//   );

//   return (
//     <div className="tradingview-widget-container" ref={container}>
//       <div className="tradingview-widget-container__widget"></div>
//       <div className="tradingview-widget-copyright"><a href="https://www.tradingview.com/markets/stocks-usa/" rel="noopener nofollow" target="_blank"><span className="blue-text">Stocks today</span></a><span className="trademark"> by TradingView</span></div>
//     </div>
//   );
// }

// export default memo(TradingViewWidget);
