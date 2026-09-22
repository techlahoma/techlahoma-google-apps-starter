import {
  ArrowDownTrayIcon,
  ChatBubbleLeftRightIcon,
  CpuChipIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import {useId, type ComponentType} from 'react';

import {cn} from '../lib/utils';

export type SystemDiagramState =
  'idle' | 'sources' | 'context' | 'loading' | 'generating' | 'answer';

export interface SystemDiagramProps {
  state: SystemDiagramState;
  runId: number;
  sources: readonly SystemDiagramSource[];
  suppliedChunkCount: number;
  className?: string;
}

export interface SystemDiagramSource {
  id: string;
  title: string;
  chunkCount: number;
  kind: 'synthetic' | 'local file';
}

interface Step {
  key: Exclude<SystemDiagramState, 'idle'>;
  label: string;
  icon: ComponentType<{className?: string; 'aria-hidden'?: boolean}>;
}

const steps: readonly Step[] = [
  {key: 'sources', label: 'Sources', icon: DocumentTextIcon},
  {key: 'context', label: 'Context', icon: FunnelIcon},
  {key: 'loading', label: 'Load model', icon: ArrowDownTrayIcon},
  {key: 'generating', label: 'Run model', icon: CpuChipIcon},
  {key: 'answer', label: 'Answer', icon: ChatBubbleLeftRightIcon},
];

const stateIndex: Record<SystemDiagramState, number> = {
  idle: -1,
  sources: 0,
  context: 1,
  loading: 2,
  generating: 3,
  answer: 4,
};

function nodeStatus(
  index: number,
  activeIndex: number,
): 'pending' | 'active' | 'complete' {
  if (index === activeIndex) return 'active';
  if (index < activeIndex) return 'complete';
  return 'pending';
}

function stepDetail({
  key,
  documentCount,
  chunkCount,
  suppliedChunkCount,
}: {
  key: Step['key'];
  documentCount: number;
  chunkCount: number;
  suppliedChunkCount: number;
}): string {
  switch (key) {
    case 'sources':
      return chunkCount === 0
        ? 'No sources selected'
        : `${documentCount} ${documentCount === 1 ? 'document' : 'documents'} · ${chunkCount} ${chunkCount === 1 ? 'chunk' : 'chunks'}`;
    case 'context':
      return `${suppliedChunkCount} ${suppliedChunkCount === 1 ? 'chunk' : 'chunks'} selected`;
    case 'loading':
      return 'Download or prepare weights';
    case 'generating':
      return 'Local model inference';
    case 'answer':
      return 'Response + receipt';
    default: {
      const exhaustive: never = key;
      return exhaustive;
    }
  }
}

export function SystemDiagram({
  state,
  runId,
  sources,
  suppliedChunkCount,
  className,
}: SystemDiagramProps) {
  const titleId = useId();
  const documentCount = sources.length;
  const chunkCount = sources.reduce(
    (total, source) => total + source.chunkCount,
    0,
  );
  const activeIndex = stateIndex[state];
  const activeLabel =
    state === 'idle' ? 'Ready for a request' : steps[activeIndex]?.label;

  return (
    <figure
      className={cn(
        'system-rail m-0 rounded-md border border-[var(--border)] bg-[#101114]/95 p-3 shadow-lg backdrop-blur-sm lg:p-4',
        className,
      )}
      aria-labelledby={titleId}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <figcaption id={titleId} className="font-semibold">
            Live request
          </figcaption>
          <p className="description m-0 text-xs" aria-live="polite">
            {activeLabel}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">
          {chunkCount} {chunkCount === 1 ? 'chunk' : 'chunks'}
        </span>
      </div>

      <ol
        key={runId}
        className="m-0 grid list-none grid-cols-5 gap-1 p-0 min-[1101px]:flex min-[1101px]:flex-col min-[1101px]:gap-0"
      >
        {steps.map((step, index) => {
          const status = nodeStatus(index, activeIndex);
          const Icon = step.icon;
          return (
            <li
              key={step.key}
              className="group relative min-w-0 min-[1101px]:pb-4 min-[1101px]:pl-8 last:min-[1101px]:pb-0"
              data-status={status}
            >
              {index > 0 && (
                <span
                  className="absolute left-[-0.25rem] right-[calc(50%+0.75rem)] top-3 h-px bg-[var(--border)] group-data-[status=active]:bg-[var(--accent)] min-[1101px]:bottom-[calc(50%+0.75rem)] min-[1101px]:left-3 min-[1101px]:right-auto min-[1101px]:top-[-50%] min-[1101px]:h-auto min-[1101px]:w-px"
                  aria-hidden="true"
                />
              )}
              <span
                className="mx-auto flex size-7 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition-[border-color,color,background-color] duration-200 group-data-[status=active]:border-[var(--accent)] group-data-[status=active]:bg-[#17243b] group-data-[status=active]:text-[var(--accent)] group-data-[status=complete]:border-[#8ab4f8] group-data-[status=complete]:text-[#8ab4f8] motion-reduce:transition-none min-[1101px]:absolute min-[1101px]:left-0 min-[1101px]:top-0"
                aria-hidden="true"
              >
                <Icon
                  className={cn(
                    'size-4',
                    step.key === 'loading' &&
                      status === 'active' &&
                      'animate-pulse motion-reduce:animate-none',
                  )}
                />
              </span>
              <div className="mt-1 min-w-0 text-center min-[1101px]:mt-0 min-[1101px]:text-left">
                <span className="block truncate text-[0.65rem] font-medium leading-tight text-[var(--muted)] group-data-[status=active]:text-white group-data-[status=complete]:text-[#b2c9ff] min-[1101px]:text-sm">
                  {step.label}
                </span>
                <span className="description hidden text-xs leading-snug min-[1101px]:block">
                  {stepDetail({
                    key: step.key,
                    documentCount,
                    chunkCount,
                    suppliedChunkCount,
                  })}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      <details className="system-source-details">
        <summary>Selected files · {sources.length}</summary>
        {sources.length === 0 ? (
          <p className="description m-0 text-xs">No documents selected.</p>
        ) : (
          <ul
            className="m-0 max-h-36 space-y-1 overflow-y-auto p-0"
            role="list"
          >
            {sources.map(source => {
              const SourceIcon =
                source.kind === 'synthetic' ? EnvelopeIcon : DocumentTextIcon;
              return (
                <li
                  key={source.id}
                  className="flex min-w-0 items-center gap-2 text-xs"
                >
                  <SourceIcon
                    className="size-4 shrink-0 text-[var(--accent)]"
                    aria-hidden="true"
                  />
                  <span
                    className="min-w-0 flex-1 truncate"
                    title={source.title}
                  >
                    {source.title}
                  </span>
                  <span className="shrink-0 text-[var(--muted)]">
                    {source.chunkCount}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </details>
      <details className="system-source-details">
        <summary>About this visual</summary>
        <p className="description">
          “Supplied” means included in the prompt. A browser app cannot observe
          which supplied text changed the model’s internal computation.
        </p>
      </details>
    </figure>
  );
}
