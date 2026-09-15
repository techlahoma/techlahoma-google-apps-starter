import {
  CheckIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {useEffect, useRef, useState} from 'react';

import {cn} from '../../lib/utils';
import {IconButton, type IconButtonProps} from './icon-button';

type CopyStatus = 'idle' | 'copied' | 'error';

export interface CopyButtonProps extends Omit<
  IconButtonProps,
  'icon' | 'label' | 'onClick'
> {
  value: string;
  label?: string;
  onCopyComplete?: (succeeded: boolean) => void;
}

export function CopyButton({
  value,
  label = 'Copy to clipboard',
  onCopyComplete,
  className,
  ...props
}: CopyButtonProps) {
  const [status, setStatus] = useState<CopyStatus>('idle');
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(
    () => () => {
      if (resetTimer.current !== undefined) clearTimeout(resetTimer.current);
    },
    [],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setStatus('copied');
      onCopyComplete?.(true);
    } catch {
      setStatus('error');
      onCopyComplete?.(false);
    }

    if (resetTimer.current !== undefined) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setStatus('idle'), 2000);
  };

  const currentLabel =
    status === 'copied'
      ? 'Copied to clipboard'
      : status === 'error'
        ? 'Could not copy to clipboard'
        : label;

  const icon =
    status === 'copied' ? (
      <CheckIcon />
    ) : status === 'error' ? (
      <ExclamationTriangleIcon />
    ) : (
      <ClipboardDocumentIcon />
    );

  return (
    <>
      <IconButton
        className={cn(
          status === 'copied' && 'text-emerald-700',
          status === 'error' && 'text-red-700',
          className,
        )}
        icon={icon}
        label={currentLabel}
        onClick={() => void handleCopy()}
        {...props}
      />
      <span aria-live="polite" className="sr-only">
        {status === 'idle' ? '' : currentLabel}
      </span>
    </>
  );
}
