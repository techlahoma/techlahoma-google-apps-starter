import {useId} from 'react';

import {cn} from '../lib/utils';

export type SystemDiagramState =
  'idle' | 'sources' | 'context' | 'model' | 'answer';

export interface SystemDiagramProps {
  state: SystemDiagramState;
  className?: string;
}

const steps = [
  {key: 'sources', label: 'Sources', detail: 'Files + examples', x: 16},
  {key: 'context', label: 'Context', detail: 'Selected evidence', x: 198},
  {key: 'model', label: 'Model', detail: 'Prompt + inference', x: 380},
  {key: 'answer', label: 'Answer', detail: 'Useful response', x: 562},
] satisfies ReadonlyArray<{
  key: Exclude<SystemDiagramState, 'idle'>;
  label: string;
  detail: string;
  x: number;
}>;

const stateIndex: Record<SystemDiagramState, number> = {
  idle: -1,
  sources: 0,
  context: 1,
  model: 2,
  answer: 3,
};

function nodeStatus(
  index: number,
  activeIndex: number,
): 'pending' | 'active' | 'complete' {
  if (index === activeIndex) return 'active';
  if (index < activeIndex) return 'complete';
  return 'pending';
}

export function SystemDiagram({state, className}: SystemDiagramProps) {
  const markerId = `system-arrow-${useId().replaceAll(':', '')}`;
  const titleId = `${markerId}-title`;
  const descriptionId = `${markerId}-description`;
  const activeIndex = stateIndex[state];
  const activeLabel =
    state === 'idle' ? 'Waiting to begin' : steps[activeIndex]?.label;

  return (
    <figure className={cn('m-0 w-full', className)}>
      <svg
        aria-labelledby={`${titleId} ${descriptionId}`}
        className="h-auto w-full"
        role="img"
        viewBox="0 0 722 210"
      >
        <title id={titleId}>How the model builds an answer</title>
        <desc id={descriptionId}>
          Sources flow into selected context, then into the model, which
          produces an answer. Current stage: {activeLabel}.
        </desc>
        <style>{`
          .system-node { color: #64748b; transition: color 220ms ease, transform 220ms ease; transform-box: fill-box; transform-origin: center; }
          .system-node[data-status='complete'] { color: #8ab4f8; }
          .system-node[data-status='active'] { color: #5eead4; transform: translateY(-3px); }
          .system-node__surface { fill: #1c1e23; stroke: currentColor; stroke-width: 2; }
          .system-node[data-status='active'] .system-node__surface { fill: #102a29; stroke-width: 3; }
          .system-node[data-status='complete'] .system-node__surface { fill: #17243b; }
          .system-node__label { fill: #f1f5f9; font: 600 15px ui-sans-serif, system-ui, sans-serif; }
          .system-node__detail { fill: #a8b0bd; font: 12px ui-sans-serif, system-ui, sans-serif; }
          .system-node__status { fill: currentColor; font: 700 9px ui-sans-serif, system-ui, sans-serif; letter-spacing: .08em; text-transform: uppercase; }
          .system-flow { color: #94a3b8; fill: none; stroke: currentColor; stroke-width: 2; }
          .system-flow[data-active='true'] { color: #8ab4f8; stroke-dasharray: 7 7; animation: system-flow 700ms linear infinite; }
          .system-active-ring { fill: none; stroke: currentColor; stroke-width: 2; opacity: 0; }
          .system-node[data-status='active'] .system-active-ring { opacity: .35; animation: system-pulse 1.8s ease-out infinite; }
          @keyframes system-flow { to { stroke-dashoffset: -14; } }
          @keyframes system-pulse { 0% { transform: scale(.92); opacity: .45; } 70%, 100% { transform: scale(1.08); opacity: 0; } }
          @media (prefers-reduced-motion: reduce) {
            .system-node, .system-flow, .system-active-ring { animation: none !important; transition: none !important; transform: none !important; }
          }
        `}</style>
        <defs>
          <marker
            id={markerId}
            markerHeight="8"
            markerWidth="8"
            orient="auto"
            refX="7"
            refY="4"
            viewBox="0 0 8 8"
          >
            <path d="M0 0L8 4L0 8Z" fill="currentColor" />
          </marker>
        </defs>

        {[0, 1, 2].map(index => (
          <path
            key={index}
            className="system-flow"
            d={`M${160 + index * 182} 106H${190 + index * 182}`}
            data-active={activeIndex > index}
            markerEnd={`url(#${markerId})`}
          />
        ))}

        {steps.map((step, index) => {
          const status = nodeStatus(index, activeIndex);
          return (
            <g
              key={step.key}
              className="system-node"
              data-status={status}
              transform={`translate(${step.x} 58)`}
            >
              <rect
                className="system-active-ring"
                height="96"
                rx="12"
                width="148"
                x="-2"
                y="-2"
              />
              <rect
                className="system-node__surface"
                height="92"
                rx="10"
                width="144"
              />
              <circle cx="18" cy="20" fill="currentColor" r="5" />
              <text className="system-node__status" x="30" y="23">
                {status}
              </text>
              <text className="system-node__label" x="14" y="54">
                {step.label}
              </text>
              <text className="system-node__detail" x="14" y="73">
                {step.detail}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="sr-only">
        Four stages: sources, selected context, model inference, and answer.
      </figcaption>
    </figure>
  );
}
