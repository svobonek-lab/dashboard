import React from 'react';
import { CloudRain, Sun, Cloud, Snowflake, Wind, AlertTriangle } from 'lucide-react';
import { WeatherInfo } from '../types';

interface WeatherWidgetProps {
  weather?: WeatherInfo;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ weather }) => {
  // Default fallback if not provided
  const data: WeatherInfo = weather || {
    date: 'Dnes',
    temp: 21,
    condition: 'Sunny',
    windSpeed: 12,
    rainProbability: 5,
    recommendation: 'Ideální podmínky pro venkovní stavební montáže a fasády.'
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'Rain': return <CloudRain className="w-5 h-5 text-blue-500" />;
      case 'Snow': return <Snowflake className="w-5 h-5 text-indigo-400" />;
      case 'Windy': return <Wind className="w-5 h-5 text-amber-500" />;
      case 'Cloudy': return <Cloud className="w-5 h-5 text-slate-500" />;
      default: return <Sun className="w-5 h-5 text-amber-500" />;
    }
  };

  const hasWarning = data.rainProbability > 60 || data.windSpeed > 35 || data.condition === 'Rain' || data.condition === 'Snow';

  return (
    <div className={`p-4 rounded-2xl border transition-all ${hasWarning ? 'bg-amber-50/70 border-amber-200' : 'bg-white border-slate-200'} shadow-xs`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            {getWeatherIcon(data.condition)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">Počasí na realizaci</span>
              <span className="text-xs font-semibold text-slate-500">{data.date}</span>
            </div>
            <p className="text-sm font-extrabold text-slate-800 mt-0.5">
              {data.temp}°C • {data.condition === 'Sunny' ? 'Slunečno' : data.condition === 'Rain' ? 'Deštivo' : 'Oblačno'}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[11px] text-slate-500">Vítr: {data.windSpeed} km/h</p>
          <p className="text-[11px] font-semibold text-blue-600">Srážky: {data.rainProbability}%</p>
        </div>
      </div>

      {hasWarning && (
        <div className="mt-3 p-2.5 rounded-xl bg-amber-100/80 border border-amber-200 flex items-center gap-2 text-xs font-medium text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Pozor: Vysoké riziko srážky nebo větru. Doporučujeme zajistit plachtování nebo posunout venkovní práce.</span>
        </div>
      )}

      {data.recommendation && !hasWarning && (
        <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 font-medium flex items-center gap-2">
          <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-md text-[10px] font-bold">AI Tip</span>
          <span>{data.recommendation}</span>
        </div>
      )}
    </div>
  );
};
