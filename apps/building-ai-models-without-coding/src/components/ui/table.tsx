import type {ComponentProps} from 'react';

// Adapted from shadcn/ui new-york-v4 Table (MIT), checked 2026-09-16:
// https://ui.shadcn.com/r/styles/new-york-v4/table.json
// Workshop overrides: dark colors, wrapping evidence cells, and column scope.

import {cn} from '../../lib/utils';

export function Table({className, ...props}: ComponentProps<'table'>) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({className, ...props}: ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn('[&_tr]:border-b', className)}
      {...props}
    />
  );
}

export function TableBody({className, ...props}: ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  );
}

export function TableFooter({className, ...props}: ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
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
      data-slot="table-row"
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
      data-slot="table-head"
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
      data-slot="table-cell"
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
      data-slot="table-caption"
      className={cn('mt-3 text-left text-sm text-slate-400', className)}
      {...props}
    />
  );
}
