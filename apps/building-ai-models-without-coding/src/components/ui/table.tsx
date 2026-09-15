import type {ComponentProps} from 'react';

import {cn} from '../../lib/utils';

export function Table({className, ...props}: ComponentProps<'table'>) {
  return (
    <div className="relative w-full overflow-auto">
      <table
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({className, ...props}: ComponentProps<'thead'>) {
  return <thead className={cn('[&_tr]:border-b', className)} {...props} />;
}

export function TableBody({className, ...props}: ComponentProps<'tbody'>) {
  return (
    <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
  );
}

export function TableFooter({className, ...props}: ComponentProps<'tfoot'>) {
  return (
    <tfoot
      className={cn(
        'border-t border-white/10 bg-white/5 font-medium text-slate-100 [&>tr]:last:border-b-0',
        className,
      )}
      {...props}
    />
  );
}

export function TableRow({className, ...props}: ComponentProps<'tr'>) {
  return (
    <tr
      className={cn(
        'border-b border-white/10 transition-colors hover:bg-white/5 data-[state=selected]:bg-white/10',
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({className, ...props}: ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'h-10 px-3 text-left align-middle text-xs font-semibold text-slate-400 [&:has([role=checkbox])]:pr-0',
        className,
      )}
      scope={props.scope ?? 'col'}
      {...props}
    />
  );
}

export function TableCell({className, ...props}: ComponentProps<'td'>) {
  return (
    <td
      className={cn(
        'p-3 align-middle text-slate-200 [&:has([role=checkbox])]:pr-0',
        className,
      )}
      {...props}
    />
  );
}

export function TableCaption({className, ...props}: ComponentProps<'caption'>) {
  return (
    <caption
      className={cn('mt-3 text-left text-sm text-slate-400', className)}
      {...props}
    />
  );
}
