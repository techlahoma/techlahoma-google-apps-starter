import type {ReactNode} from 'react';

import {Button, type ButtonProps} from './button';

export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  label: string;
  icon: ReactNode;
  tooltip?: string;
}

export function IconButton({
  label,
  icon,
  tooltip = label,
  size = 'icon',
  variant = 'ghost',
  ...props
}: IconButtonProps) {
  return (
    <Button
      aria-label={label}
      title={tooltip}
      size={size}
      variant={variant}
      {...props}
    >
      <span aria-hidden="true" className="size-4">
        {icon}
      </span>
    </Button>
  );
}
