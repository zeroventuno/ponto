import { History } from 'lucide-react';

interface HourglassIconProps {
    size?: number;
    color?: string;
}

export const HourglassIcon: React.FC<HourglassIconProps> = ({ size = 24, color = 'currentColor' }) => (
    <History size={size} color={color} strokeWidth={2.2} />
);
