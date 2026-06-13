interface LogoProps {
  size?: number;
}

/** Compact pixel-grid mark used in the top bar and favicon. */
export function Logo({ size = 28 }: LogoProps) {
  const cells: [number, number, string][] = [
    [0, 0, "#7fb238"],
    [1, 0, "#5b9cff"],
    [2, 0, "#9aa2ad"],
    [0, 1, "#3d6fd6"],
    [1, 1, "#c08552"],
    [2, 1, "#7fb238"],
    [0, 2, "#c5cbd3"],
    [1, 2, "#7db4ff"],
    [2, 2, "#4a525f"],
  ];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      shapeRendering="crispEdges"
      aria-hidden
    >
      <rect width="32" height="32" rx="7" fill="#15181d" />
      {cells.map(([x, y, fill]) => (
        <rect
          key={`${x}-${y}`}
          x={7 + x * 6}
          y={7 + y * 6}
          width={6}
          height={6}
          fill={fill}
        />
      ))}
    </svg>
  );
}
