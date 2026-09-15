import {forwardRef, type ButtonHTMLAttributes} from 'react';

import {cn} from '../../lib/utils';

export type ButtonVariant =
  'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

const variantClasses: Record<ButtonVariant, string> = {
  default: 'bg-blue-400 text-slate-950 shadow-sm hover:bg-blue-300',
  secondary: 'bg-white/10 text-slate-100 hover:bg-white/15',
  outline:
    'border border-white/20 bg-[#1c1e23] text-slate-100 shadow-sm hover:bg-white/10',
  ghost: 'text-slate-300 hover:bg-white/10 hover:text-white',
  destructive: 'bg-red-500 text-white shadow-sm hover:bg-red-400',
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-10 px-4 py-2',
  sm: 'h-8 rounded-md px-3 text-xs',
  lg: 'h-11 rounded-md px-6',
  icon: 'size-9 p-0',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      type = 'button',
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1c1e23] disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = 'Button';
