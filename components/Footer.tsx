
import React from 'react';
import { ActivityLog } from '../types';

interface FooterProps {
    logs: ActivityLog[];
}

export const Footer: React.FC<FooterProps> = ({ logs }) => {
    return (
        <footer className="fixed bottom-0 left-0 right-0 bg-dark text-light p-2 shadow-inner z-40">
            <div className="container mx-auto flex items-center overflow-hidden">
                <span className="font-bold text-accent pl-4 text-sm whitespace-nowrap">آخر الأنشطة:</span>
                <div className="relative flex overflow-x-hidden w-full">
                    <div className="animate-marquee whitespace-nowrap flex">
                        {logs.length > 0 ? logs.map(log => (
                            <span key={log.id} className="mx-4 text-sm">{log.text}</span>
                        )) : <span className="mx-4 text-sm">لا توجد أنشطة حديثة.</span>}
                    </div>
                     <div className="absolute top-0 animate-marquee2 whitespace-nowrap flex">
                         {logs.length > 0 ? logs.map(log => (
                            <span key={log.id + '-clone'} className="mx-4 text-sm">{log.text}</span>
                        )) : <span className="mx-4 text-sm"></span>}
                    </div>
                </div>
            </div>
            <style>{`
                .animate-marquee {
                    animation: marquee 30s linear infinite;
                }
                .animate-marquee2 {
                    animation: marquee2 30s linear infinite;
                }
                @keyframes marquee {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-100%); }
                }
                @keyframes marquee2 {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(0%); }
                }
            `}</style>
        </footer>
    );
};
