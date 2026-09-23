import type { SajuChart } from "../lib/saju/chart";
import { buildElementProfile } from "../lib/saju/elements";

const center = 160;
const outerRadius = 100;
const labelRadius = 127;

function point(index: number, radius: number) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / 5;
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  };
}

function polygonPoints(radius: number) {
  return Array.from({ length: 5 }, (_, index) => {
    const { x, y } = point(index, radius);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

export default function ElementChart({ chart }: { chart: SajuChart }) {
  const profile = buildElementProfile(chart);
  const valuePoints = profile.entries
    .map((entry, index) => {
      const { x, y } = point(index, (entry.count / profile.scale) * outerRadius);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <section className="element-section" aria-labelledby="element-title">
      <h3 id="element-title">나의 오행 분포</h3>
      <p className="section-intro">오각형이 바깥으로 뻗을수록 해당 오행의 개수가 많습니다.</p>
      <figure className="element-figure">
        <svg viewBox="0 0 320 320" className="element-svg" aria-hidden="true">
          {[0.25, 0.5, 0.75, 1].map((ratio) => (
            <polygon
              key={ratio}
              points={polygonPoints(outerRadius * ratio)}
              fill="none"
              stroke="#d7e0eb"
              strokeWidth="1"
            />
          ))}
          {profile.entries.map((entry, index) => {
            const end = point(index, outerRadius);
            return (
              <line
                key={entry.name}
                x1={center}
                y1={center}
                x2={end.x}
                y2={end.y}
                stroke="#d7e0eb"
                strokeWidth="1"
              />
            );
          })}
          <polygon
            points={valuePoints}
            fill="rgba(0, 102, 204, 0.2)"
            stroke="#0066cc"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {profile.entries.map((entry, index) => {
            const value = point(index, (entry.count / profile.scale) * outerRadius);
            const label = point(index, labelRadius);
            return (
              <g key={entry.name}>
                <circle cx={value.x} cy={value.y} r="5" fill="#0066cc" />
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="element-axis-label"
                >
                  {entry.name} {entry.count}
                </text>
              </g>
            );
          })}
        </svg>
        <figcaption>목·화·토·금·수의 개수 비교 · 그래프 눈금: 0~{profile.scale}개</figcaption>
      </figure>
      <ul className="element-list" aria-label="오행별 개수와 구분">
        {profile.entries.map((entry) => (
          <li key={entry.name}>
            <span className="element-name">{entry.name}</span>
            <strong>{entry.count}개</strong>
            <span className={`element-level ${entry.level === "많은 편" ? "high" : entry.level === "적은 편" ? "low" : ""}`}>
              {entry.level}
            </span>
          </li>
        ))}
      </ul>
      <p className="element-summary">
        <strong>적은 편:</strong> {profile.low.length ? profile.low.join("·") : "없음"}
        <span aria-hidden="true"> · </span>
        <strong>많은 편:</strong> {profile.high.length ? profile.high.join("·") : "없음"}
      </p>
      <p className="element-method">
        {chart.elementMethod} 화면의 구분은 0~1개가 적은 편, 2개가 보통, 3개 이상이 많은 편입니다.
        적게 나와도 해당 성향이 없다는 뜻은 아닙니다.
      </p>
    </section>
  );
}
