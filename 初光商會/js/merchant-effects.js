import{SPIN_RULES}from'./spin-arena-config.js?v=20261116-v64';
// Aggregate once. Individual games keep their own daily source records.
export function merchantTrafficEffects(s,auctionMultiplier=1){const arena=s.spinArena?.daily?.day===s.day?s.spinArena.daily.traffic||0:0;return Math.min(SPIN_RULES.combinedTrafficCap,Math.max(.65,auctionMultiplier*(1+Math.min(SPIN_RULES.trafficCap,arena))));}
