import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { usePartyTree } from '../hooks/useApi';
import { TreePine, Maximize2, Minimize2, Eye } from 'lucide-react';

export default function TreeView() {
  const { data: parties, loading } = usePartyTree();

  if (loading) return <TreeSkeleton />;
  if (!parties || parties.length === 0) return <div className="text-center py-20 text-slate-500">No data available</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <TreePine className="text-green-400" />
            Party Trees — 13th Jatiya Sangsad
            <span className="text-sm font-normal text-slate-400 font-bangla">পার্টি ট্রি ভিজ্যুয়ালাইজেশন</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Each party is a tree — bigger trees have more seats. Click to explore divisions & constituencies.
            <span className="text-xs ml-2 text-slate-500">12 parties • AL suspended • 300 seats</span>
          </p>
        </div>
      </div>

      {/* Tree Forest - All parties */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {parties.filter(p => p.totalSeats > 0).map((party, index) => (
          <PartyTreeCard key={party.id} party={party} rank={index + 1} />
        ))}
      </div>

      {/* Parties with no seats */}
      {parties.filter(p => p.totalSeats === 0).length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-bold text-slate-400 mb-3">Other Parties (0 seats leading)</h3>
          <div className="flex flex-wrap gap-2">
            {parties.filter(p => p.totalSeats === 0).map(party => (
              <span key={party.id} className="party-badge" style={{ 
                borderColor: party.color + '40',
                backgroundColor: party.color + '10',
                color: party.color 
              }}>
                {party.short_name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PartyTreeCard({ party, rank }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (!party || !svgRef.current) return;
    drawTree(party, svgRef.current, containerRef.current, setTooltip, expanded);
  }, [party, expanded]);

  const height = expanded ? 600 : 350;
  const medalEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

  return (
    <div className={`glass-card-hover overflow-hidden ${expanded ? 'lg:col-span-2' : ''}`}>
      {/* Card Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{medalEmoji}</div>
          <div 
            className="w-4 h-4 rounded-full" 
            style={{ backgroundColor: party.color }}
          />
          <div>
            <h3 className="font-bold text-lg">{party.short_name}</h3>
            <p className="text-xs text-slate-400">{party.name}</p>
            {party.leader && <p className="text-[10px] text-slate-500">Leader: {party.leader}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl font-black" style={{ color: party.color }}>
              {party.totalSeats}
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">seats leading</div>
          </div>
          <button 
            onClick={() => setExpanded(!expanded)}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Division breakdown mini-bar */}
      <div className="px-4 py-2 flex gap-1 bg-black/20">
        {party.divisions.map(div => (
          <div
            key={div.name}
            className="h-1.5 rounded-full transition-all"
            style={{
              backgroundColor: party.color,
              width: `${(div.seats.length / party.totalSeats) * 100}%`,
              opacity: 0.3 + (div.seats.length / party.totalSeats) * 0.7,
            }}
            title={`${div.name}: ${div.seats.length} seats`}
          />
        ))}
      </div>

      {/* D3 Tree */}
      <div ref={containerRef} className="relative" style={{ height }}>
        <svg ref={svgRef} width="100%" height={height} />
        
        {/* Tooltip */}
        {tooltip && (
          <div 
            className="absolute z-20 glass-card p-3 text-xs pointer-events-none"
            style={{ 
              left: Math.min(tooltip.x, containerRef.current?.clientWidth - 200 || tooltip.x), 
              top: tooltip.y - 10 
            }}
          >
            <div className="font-bold text-white">{tooltip.name}</div>
            {tooltip.candidate && (
              <div className="text-slate-400 mt-1">
                <div>🏆 {tooltip.candidate}</div>
                <div>📊 {tooltip.votes?.toLocaleString()} votes ({tooltip.percentage}%)</div>
                <div>📍 {tooltip.status}</div>
              </div>
            )}
            {tooltip.division && !tooltip.candidate && (
              <div className="text-slate-400 mt-1">
                {tooltip.seatCount} seats in {tooltip.division}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Division Legend */}
      <div className="px-4 py-3 border-t border-white/5 flex flex-wrap gap-2">
        {party.divisions.map(div => (
          <span key={div.name} className="text-xs bg-white/5 px-2 py-1 rounded-md text-slate-400">
            {div.name}: <span className="font-bold text-white">{div.seats.length}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Draw D3 Tree for a party
 */
function drawTree(party, svgEl, containerEl, setTooltip, expanded) {
  const svg = d3.select(svgEl);
  svg.selectAll('*').remove();

  const width = containerEl?.clientWidth || 600;
  const height = expanded ? 580 : 330;
  const margin = { top: 30, right: 30, bottom: 30, left: 30 };

  // Build hierarchical data
  const treeData = {
    name: party.short_name,
    color: party.color,
    children: party.divisions.map(div => ({
      name: div.name,
      division: div.name,
      seatCount: div.seats.length,
      children: expanded ? div.seats.map(seat => ({
        name: seat.constituency_name,
        candidate: seat.candidate_name,
        votes: seat.votes,
        percentage: seat.vote_percentage,
        status: seat.status,
        leaf: true,
      })) : [],
    })),
  };

  const root = d3.hierarchy(treeData);
  
  const treeLayout = d3.tree()
    .size([width - margin.left - margin.right, height - margin.top - margin.bottom])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.5));

  treeLayout(root);

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  // Links
  g.selectAll('.tree-link')
    .data(root.links())
    .join('path')
    .attr('class', 'tree-link')
    .attr('d', d3.linkVertical()
      .x(d => d.x)
      .y(d => d.y))
    .attr('stroke', party.color)
    .attr('stroke-width', d => Math.max(1, 4 - d.target.depth))
    .attr('stroke-opacity', d => 0.4 - d.target.depth * 0.1);

  // Nodes
  const nodes = g.selectAll('.tree-node')
    .data(root.descendants())
    .join('g')
    .attr('class', 'tree-node')
    .attr('transform', d => `translate(${d.x}, ${d.y})`)
    .style('cursor', 'pointer')
    .on('mouseover', (event, d) => {
      const rect = containerEl.getBoundingClientRect();
      const svgRect = svgEl.getBoundingClientRect();
      setTooltip({
        x: event.clientX - svgRect.left,
        y: event.clientY - svgRect.top,
        name: d.data.name,
        candidate: d.data.candidate,
        votes: d.data.votes,
        percentage: d.data.percentage,
        status: d.data.status,
        division: d.data.division,
        seatCount: d.data.seatCount,
      });
    })
    .on('mouseout', () => setTooltip(null));

  // Root node (party)
  nodes.filter(d => d.depth === 0)
    .append('circle')
    .attr('r', 20)
    .attr('fill', party.color)
    .attr('stroke', 'white')
    .attr('stroke-width', 3)
    .attr('filter', 'drop-shadow(0 0 10px ' + party.color + '80)');

  nodes.filter(d => d.depth === 0)
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', 5)
    .attr('fill', 'white')
    .attr('font-weight', 'bold')
    .attr('font-size', '12px')
    .text(d => d.data.name);

  // Division nodes (depth 1)
  nodes.filter(d => d.depth === 1)
    .append('circle')
    .attr('r', d => 8 + (d.data.seatCount || 0) * 0.8)
    .attr('fill', party.color + '30')
    .attr('stroke', party.color)
    .attr('stroke-width', 2);

  nodes.filter(d => d.depth === 1)
    .append('text')
    .attr('class', 'tree-label')
    .attr('dy', d => -(12 + (d.data.seatCount || 0) * 0.8))
    .text(d => `${d.data.name} (${d.data.seatCount})`);

  // Seat count inside division node
  nodes.filter(d => d.depth === 1)
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', 4)
    .attr('fill', party.color)
    .attr('font-weight', 'bold')
    .attr('font-size', '10px')
    .text(d => d.data.seatCount);

  // Leaf nodes (constituencies, only in expanded mode)
  nodes.filter(d => d.depth === 2)
    .append('circle')
    .attr('r', 4)
    .attr('fill', d => d.data.status === 'declared' ? party.color : party.color + '80')
    .attr('stroke', d => d.data.status === 'declared' ? '#fff' : party.color)
    .attr('stroke-width', 1);

  // Add subtle animation
  svg.selectAll('.tree-node circle')
    .attr('opacity', 0)
    .transition()
    .duration(800)
    .delay((d, i) => i * 30)
    .attr('opacity', 1);

  svg.selectAll('.tree-link')
    .attr('stroke-dasharray', function() { return this.getTotalLength(); })
    .attr('stroke-dashoffset', function() { return this.getTotalLength(); })
    .transition()
    .duration(1000)
    .delay((d, i) => i * 20)
    .attr('stroke-dashoffset', 0);
}

function TreeSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-64 bg-white/5 rounded-lg shimmer" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass-card h-96 shimmer" />
        ))}
      </div>
    </div>
  );
}
