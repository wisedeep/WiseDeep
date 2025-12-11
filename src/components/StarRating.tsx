import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
    rating: number;
    onRatingChange?: (rating: number) => void;
    readonly?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export const StarRating = ({ rating, onRatingChange, readonly = false, size = 'md' }: StarRatingProps) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6'
    };

    const handleClick = (value: number) => {
        if (!readonly && onRatingChange) {
            onRatingChange(value);
        }
    };

    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
                <button
                    key={value}
                    type="button"
                    onClick={() => handleClick(value)}
                    disabled={readonly}
                    className={cn(
                        "transition-colors",
                        !readonly && "cursor-pointer hover:scale-110",
                        readonly && "cursor-default"
                    )}
                >
                    <Star
                        className={cn(
                            sizeClasses[size],
                            value <= rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "fill-none text-gray-300"
                        )}
                    />
                </button>
            ))}
        </div>
    );
};

export default StarRating;
