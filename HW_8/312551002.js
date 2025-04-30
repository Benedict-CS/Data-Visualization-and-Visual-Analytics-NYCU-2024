d3.sankey = function () {
    var sankey = {},
        nodeWidth = 24,
        nodePadding = 10,
        size = [1, 1],
        nodes = [],
        links = [],
        attributeOrder = ['buying', 'maintenance', 'doors', 'persons', 'luggage boot', 'safety'];

    sankey.nodeWidth = function (_) { if (!arguments.length) return nodeWidth; nodeWidth = +_; return sankey; };
    sankey.nodePadding = function (_) { if (!arguments.length) return nodePadding; nodePadding = +_; return sankey; };
    sankey.nodes = function (_) { if (!arguments.length) return nodes; nodes = _; return sankey; };
    sankey.links = function (_) { if (!arguments.length) return links; links = _; return sankey; };
    sankey.size = function (_) { if (!arguments.length) return size; size = _; return sankey; };
    sankey.attributeOrder = function (_) { if (!arguments.length) return attributeOrder; attributeOrder = _; return sankey; };

    sankey.layout = function (iterations) {
        computeNodeLinks();
        computeNodeValues();
        computeNodeBreadths();
        computeNodeDepths(iterations);
        computeLinkDepths();
        computeColorID();
        return sankey;
    };

    sankey.relayout = function () { computeLinkDepths(); return sankey; };

    sankey.link = function () {
        var curvature = 0.5;
        function link(d) {
            var x0 = d.source.x + d.source.dx,
                x1 = d.target.x,
                xi = d3.interpolateNumber(x0, x1),
                x2 = xi(curvature),
                x3 = xi(1 - curvature),
                y0 = d.source.y + d.sy + d.dy / 2,
                y1 = d.target.y + d.ty + d.dy / 2;
            return `M${x0},${y0}C${x2},${y0} ${x3},${y1} ${x1},${y1}`;
        }
        link.curvature = function (_) { if (!arguments.length) return curvature; curvature = +_; return link; };
        return link;
    };

    function computeNodeLinks() {
        nodes.forEach(function (node) { node.sourceLinks = []; node.targetLinks = []; });
        links.forEach(function (link) {
            var source = link.source, target = link.target;
            if (typeof source === 'number') source = link.source = nodes[link.source];
            if (typeof target === 'number') target = link.target = nodes[link.target];
            source.sourceLinks.push(link); target.targetLinks.push(link);
        });
    }

    function computeNodeValues() {
        nodes.forEach(function (node) {
            node.value = Math.max(d3.sum(node.sourceLinks, value), d3.sum(node.targetLinks, value));
        });
    }

    function computeNodeBreadths() {
        attributeOrder.forEach(function (attribute, i) {
            var nodesForAttribute = nodes.filter(function (node) { return node.name.startsWith(attribute); });
            nodesForAttribute.forEach(function (node) { node.x = i; node.dx = nodeWidth; });
        });
        moveSinksRight(attributeOrder.length);
        scaleNodeBreadths((size[0] - nodeWidth) / (attributeOrder.length - 1));
    }

    function moveSinksRight(x) { nodes.forEach(function (node) { if (!node.sourceLinks.length) { node.x = x - 1; } }); }
    function scaleNodeBreadths(kx) { nodes.forEach(function (node) { node.x *= kx; }); }

    function computeNodeDepths(iterations) {
        var nodesByBreadth = d3.nest().key((d) => d.x).sortKeys(d3.ascending).entries(nodes).map((d) => d.values);
        initializeNodeDepth(); resolveCollisions();
        for (var alpha = 1; iterations > 0; --iterations) {
            relaxRightToLeft((alpha *= 0.99)); resolveCollisions();
            relaxLeftToRight(alpha); resolveCollisions();
        }
        function initializeNodeDepth() {
            var ky = d3.min(nodesByBreadth, (nodes) =>
                (size[1] - (nodes.length - 1) * nodePadding) / d3.sum(nodes, value)
            );
            nodesByBreadth.forEach(function (nodes) {
                nodes.forEach((node, i) => { node.y = i; node.dy = node.value * ky; });
            });
            links.forEach((link) => (link.dy = link.value * ky));
        }

        function relaxLeftToRight(alpha) {
            nodesByBreadth.forEach(function (nodes) {
                nodes.forEach((node) => {
                    if (node.targetLinks.length) {
                        var y = d3.sum(node.targetLinks, weightedSource) / d3.sum(node.targetLinks, value);
                        node.y += (y - center(node)) * alpha;
                    }
                });
            });
            function weightedSource(link) { return center(link.source) * link.value; }
        }

        function relaxRightToLeft(alpha) {
            nodesByBreadth.slice().reverse().forEach(function (nodes) {
                nodes.forEach((node) => {
                    if (node.sourceLinks.length) {
                        var y = d3.sum(node.sourceLinks, weightedTarget) / d3.sum(node.sourceLinks, value);
                        node.y += (y - center(node)) * alpha;
                    }
                });
            });
            function weightedTarget(link) { return center(link.target) * link.value; }
        }

        function resolveCollisions() {
            nodesByBreadth.forEach(function (nodes) {
                var node, dy, y0 = 0, n = nodes.length, i;
                nodes.sort(ascendingDepth);
                for (i = 0; i < n; ++i) {
                    node = nodes[i]; dy = y0 - node.y;
                    if (dy > 0) node.y += dy; y0 = node.y + node.dy + nodePadding;
                }
                dy = y0 - nodePadding - size[1];
                if (dy > 0) {
                    y0 = node.y -= dy;
                    for (i = n - 2; i >= 0; --i) {
                        node = nodes[i]; dy = node.y + node.dy + nodePadding - y0;
                        if (dy > 0) node.y -= dy; y0 = node.y;
                    }
                }
            });
        }

        function ascendingDepth(a, b) { return a.y - b.y; }
    }

    function computeLinkDepths() {
        nodes.forEach(function (node) { node.sourceLinks.sort(ascendingTargetDepth); node.targetLinks.sort(ascendingSourceDepth); });
        nodes.forEach(function (node) {
            var sy = 0, ty = 0;
            node.sourceLinks.forEach(function (link) { link.sy = sy; sy += link.dy; });
            node.targetLinks.forEach(function (link) { link.ty = ty; ty += link.dy; });
        });
        function ascendingSourceDepth(a, b) { return a.source.y - b.source.y; }
        function ascendingTargetDepth(a, b) { return a.target.y - b.target.y; }
    }

    function computeColorID() {
        attributeOrder.forEach(function (attribute) {
            var nodesForAttribute = nodes.filter((node) => node.name.startsWith(attribute));
            nodesForAttribute.sort((a, b) => a.y - b.y);
            nodesForAttribute.forEach((node, index) => { node.cid = index; });
        });
    }

    function center(node) { return node.y + node.dy / 2; }
    function value(link) { return link.value; }
    return sankey;
};

(function (d3) {
    'use strict';

    const svg = d3.select('#sankey-diagram'),
          tooltip = d3.select('#tooltip'),
          margin = { top: 50, right: 50, bottom: 150, left: 50 },
          diagramWidth = +svg.attr('width') - margin.left - margin.right,
          diagramHeight = +svg.attr('height') - margin.top - margin.bottom;

    const sankey = d3.sankey().nodeWidth(10).nodePadding(2).size([diagramWidth, diagramHeight]);
    const path = sankey.link();
    let categories = ['buying', 'maintenance', 'doors', 'persons', 'luggage boot', 'safety'];

    const colorScales = {
        "buying": ['hsl(30, 80%, 70%)', 'hsl(30, 70%, 60%)', 'hsl(30, 60%, 50%)', 'hsl(30, 50%, 40%)'],
        "maintenance": ['hsl(200, 80%, 70%)', 'hsl(200, 70%, 60%)', 'hsl(200, 60%, 50%)', 'hsl(200, 50%, 40%)'],
        "doors": ['hsl(90, 80%, 70%)', 'hsl(90, 70%, 60%)', 'hsl(90, 60%, 50%)', 'hsl(90, 50%, 40%)'],
        "persons": ['hsl(300, 80%, 70%)', 'hsl(300, 70%, 60%)', 'hsl(300, 60%, 50%)'],
        "luggage boot": ['hsl(0, 80%, 70%)', 'hsl(0, 70%, 60%)', 'hsl(0, 60%, 50%)'],
        "safety": ['hsl(270, 80%, 70%)', 'hsl(270, 70%, 60%)', 'hsl(270, 60%, 50%)']
    };

    let globalData;

    d3.text("./car.data").then((r) => {
        const data = d3.csvParse(`buying,maintenance,doors,persons,luggage boot,safety\n${r}`);
        globalData = data;
        render(transformData(data));

        function transformData(data) {
            const nodesById = {}, linksMap = {};
            data.forEach(row => {
                categories.forEach((col, i) => {
                    if (i === categories.length - 1) return;
                    const source = `${col}-${row[col]}`, target = `${categories[i + 1]}-${row[categories[i + 1]]}`;
                    if (!target || target === '-') return;
                    linksMap[`${source}->${target}`] = linksMap[`${source}->${target}`] || { source, target, value: 0 };
                    linksMap[`${source}->${target}`].value += 1;
                    nodesById[source] = nodesById[target] = true;
                });
            });
            return {
                nodes: Object.keys(nodesById).map(id => ({ name: id, label: id.substr(0, 20) })),
                links: Object.values(linksMap)
            };
        }
    });

    function render(graph) {
        svg.selectAll("*").remove();

        const headers = svg.append("g")
            .attr("class", "column-headers")
            .attr("transform", `translate(${margin.left}, ${margin.top - 30})`);

        const xScale = d3.scalePoint()
            .domain(categories)
            .range([0, diagramWidth]);

        headers.selectAll(".header")
            .data(categories)
            .enter()
            .append("text")
            .attr("x", d => xScale(d))
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .attr("class", "header")
            .text(d => d)
            .call(d3.drag()
                .on("start", dragStart)
                .on("drag", dragged)
                .on("end", dragEnd));

        function dragStart(d) {
            d3.select(this).raise().classed("active", true);
        }

        function dragged(d, i) {
            const x = Math.max(0, Math.min(diagramWidth, d3.event.x));
            d3.select(this)
                .attr("x", x);
        }

        function dragEnd(d, i) {
            d3.select(this).classed("active", false);

            const x = Math.max(0, Math.min(diagramWidth, d3.event.x));
            const iOld = categories.indexOf(d);
            let distances = categories.map(cat => Math.abs(xScale(cat) - x));
            let newIndex = distances.indexOf(Math.min(...distances));

            if (newIndex !== iOld && newIndex >= 0 && newIndex < categories.length) {
                categories.splice(iOld, 1);
                categories.splice(newIndex, 0, d);
                sankey.attributeOrder(categories);
                render(transformData(globalData));
            } else {
                d3.select(this)
                    .attr("x", xScale(d))
                    .attr("y", -10);
            }
        }

        function transformData(data) {
            const nodesById = {}, linksMap = {};
            data.forEach(row => {
                categories.forEach((col, i) => {
                    if (i === categories.length - 1) return;
                    const source = `${col}-${row[col]}`, target = `${categories[i + 1]}-${row[categories[i + 1]]}`;
                    if (!target || target === '-') return;
                    linksMap[`${source}->${target}`] = linksMap[`${source}->${target}`] || { source, target, value: 0 };
                    linksMap[`${source}->${target}`].value += 1;
                    nodesById[source] = nodesById[target] = true;
                });
            });
            return {
                nodes: Object.keys(nodesById).map(id => ({ name: id, label: id.substr(0, 20) })),
                links: Object.values(linksMap)
            };
        }

        const nodeMap = Object.fromEntries(graph.nodes.map(x => [x.name, x]));
        graph.links.forEach(x => { x.source = nodeMap[x.source]; x.target = nodeMap[x.target]; });
        sankey.nodes(graph.nodes).links(graph.links).attributeOrder(categories).layout(32);

        xScale.domain(categories);

        const link = svg.append('g').selectAll('.link')
            .data(graph.links)
            .enter().append('path')
            .attr('class', 'link')
            .attr('d', path)
            .attr('transform', `translate(${margin.left},${margin.top})`)
            .style('stroke-width', d => Math.max(1, d.dy))
            .style('stroke', d => {
                const category = d.source.name.split('-')[0];
                return colorScales[category][d.source.cid % colorScales[category].length];
            })
            .style('fill', 'none')
            .sort((a, b) => b.dy - a.dy)
            .on('mouseover', function(d) {
                d3.select(this)
                    .style('stroke-opacity', 0.7)
                    .style('stroke-width', Math.max(1, d.dy) + 2);
                showTooltip(d, link);
            })
            .on('mouseout', function(d) {
                d3.select(this)
                    .style('stroke-opacity', 0.2)
                    .style('stroke-width', Math.max(1, d.dy));
                hideTooltip(link);
            });

        const node = svg.append('g').selectAll('.node')
            .data(graph.nodes)
            .enter().append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${margin.left + d.x},${margin.top + d.y})`)
            .call(d3.drag()
                .on('start', function () { d3.select(this).raise(); })
                .on('drag', dragmove))
            .on('mouseover', function(d) {
                d3.select(this).select('rect').style('fill-opacity', 1);
                link.filter(l => l.source === d || l.target === d)
                    .style('stroke-opacity', 0.7)
                    .style('stroke-width', d => Math.max(1, d.dy) + 2);
            })
            .on('mouseout', function(d) {
                d3.select(this).select('rect').style('fill-opacity', 0.9);
                link.filter(l => l.source === d || l.target === d)
                    .style('stroke-opacity', 0.2)
                    .style('stroke-width', d => Math.max(1, d.dy));
            });

        node.append('rect')
            .attr('height', d => d.dy)
            .attr('width', sankey.nodeWidth())
            .style('fill', d => colorScales[d.name.split('-')[0]][d.cid % colorScales[d.name.split('-')[0]].length])
            .on('mouseover', d => showTooltip(d, link))
            .on('mouseout', () => hideTooltip(link));

        node.append('text')
            .attr('x', -6)
            .attr('y', d => d.dy / 2)
            .attr('dy', '.35em')
            .attr('text-anchor', 'end')
            .text(d => d.label.split('-')[1])
            .filter(d => d.x < diagramWidth / 2)
            .attr('x', 6 + sankey.nodeWidth())
            .attr('text-anchor', 'start');

        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${margin.left}, ${diagramHeight + margin.top + 15})`);

        legend.selectAll(".legend-item")
            .data(categories)
            .enter()
            .append("g")
            .attr("class", "legend-item")
            .attr("transform", d => `translate(${xScale(d)}, 0)`)
            .each(function(d) {
                d3.select(this).append("rect")
                    .attr("x", -10)
                    .attr("y", 0)
                    .attr("width", 20)
                    .attr("height", 20)
                    .style("fill", colorScales[d][0]);

                d3.select(this).append("text")
                    .attr("x", 15)
                    .attr("y", 15)
                    .text(d)
                    .attr("text-anchor", "start");
            });

        function dragmove(d) {
            d.x = Math.max(0, Math.min(diagramWidth - sankey.nodeWidth(), d3.event.x - margin.left));
            d.y = Math.max(0, Math.min(diagramHeight - d.dy, d3.event.y - margin.top));
            d3.select(this).attr('transform', `translate(${margin.left + d.x},${margin.top + d.y})`);
            sankey.relayout();
            link.attr('d', path);
        }

        function showTooltip(d, link) {
            const rawCount = d.value || d.source.value;
            const total = d3.sum(graph.links, l => l.value);
            const ratio = ((rawCount / total) * 100).toFixed(2) + '%';

            tooltip.transition().duration(200).style('opacity', 0.9);
            tooltip.html(`<strong>${d.name || d.source.name}</strong><br>Count: ${rawCount}<br>Ratio: ${ratio}`)
                .style('left', `${d3.event.pageX + 5}px`)
                .style('top', `${d3.event.pageY - 28}px`);
            link.filter(l => l.source === d || l.target === d).style('stroke-opacity', 0.5);
        }

        function hideTooltip(link) {
            link.style('stroke-opacity', 0.2);
            tooltip.transition().duration(500).style('opacity', 0);
        }

        function deleteNode(node, graph) {
            graph.nodes = graph.nodes.filter(n => n !== node);
            graph.links = graph.links.filter(l => l.source !== node && l.target !== node);
            render(graph);
        }
    }

}(d3));
