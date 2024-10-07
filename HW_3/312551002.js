const data_path = 'http://vis.lab.djosix.com:2024/data/abalone.data';

const margin = { top: 70, right: 30, bottom: 50, left: 30 },
    width = 650 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

d3.text(data_path).then(function (data) {
    const features = ["Length", "Diameter", "Height", "Whole weight", "Shucked weight", "Viscera weight", "Shell weight", "Rings"];
    const data_M = [], data_F = [], data_I = [];

    const rows = data.split("\n");
    rows.forEach(function (row) {
        const cols = row.split(",");
        const entry = [];
        for (let i = 1; i <= 8; i++) {
            entry.push(+cols[i]);
        }
        if (cols[0] === "M") data_M.push(entry);
        else if (cols[0] === "F") data_F.push(entry);
        else if (cols[0] === "I") data_I.push(entry);
    });

    const cm_M = correlation_matrix(data_M);
    const cm_F = correlation_matrix(data_F);
    const cm_I = correlation_matrix(data_I);

    render_cm(cm_M);

    document.querySelector('#categories').addEventListener('change', function () {
        const selectedCategory = this.value;
        if (selectedCategory === 'male') {
            render_cm(cm_M);
        } else if (selectedCategory === 'female') {
            render_cm(cm_F);
        } else if (selectedCategory === 'infant') {
            render_cm(cm_I);
        }
    });

    function correlation_matrix(data) {
        const matrix = math.transpose(data);
        const cm = [];
        for (let i = 0; i < matrix.length; i++) {
            for (let j = 0; j < matrix.length; j++) {
                const corr = math.corr(matrix[i], matrix[j]);
                cm.push({ x: features[i], y: features[j], value: corr });
            }
        }
        return cm;
    }

    function render_legend() {
        const legendHeight = 15, legendTop = 0;
        const svgLegend = d3.select(".legend").append("svg")
            .attr("width", width)
            .attr("height", legendHeight + legendTop + 30) 
            .append("g")
            .attr("transform", `translate(${margin.left}, ${legendTop})`);

        const gradient = svgLegend.append("defs")
            .append("linearGradient")
            .attr("id", "linear-gradient");

        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#ffffff");
        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#000080");

        svgLegend.append("rect")
            .attr("width", width)
            .attr("height", legendHeight)
            .style("fill", "url(#linear-gradient)");

        const legendScale = [0, 1];  
        svgLegend.selectAll("text")
            .data(legendScale)
            .enter().append("text")
            .attr("x", function (d, i) { return i === 0 ? 0 : width - 35; })  
            .attr("dy", 35) 
            .attr("class", "legend-text")
            .style("text-anchor", function (d, i) { return i === 0 ? "start" : "end"; }) 
            .text(function (d) { return d.toFixed(1); });
    }

    function render_cm(cm) {
        d3.select("#cm").select('svg').remove();

        const domain = Array.from(new Set(cm.map(function (d) { return d.x; })));
        const num = Math.sqrt(cm.length);

        const color = d3.scaleLinear()
            .domain([0, 1])
            .range(["#ffffff", "#000080"]);

        const size = d3.scaleSqrt()
            .domain([0, 1])
            .range([0, 12]);

        const x = d3.scalePoint().range([0, width]).domain(domain);
        const y = d3.scalePoint().range([0, height]).domain(domain);

        const svg = d3.select("#cm").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const cor = svg.selectAll(".cor")
            .data(cm)
            .enter().append("g")
            .attr("class", "cor")
            .attr("transform", function (d) {
                return `translate(${x(d.x)}, ${y(d.y)})`;
            });

        cor.filter(function (d) {
            return domain.indexOf(d.x) <= domain.indexOf(d.y);
        }).append("text")
            .attr("y", 5)
            .text(function (d) {
                return d.x === d.y ? d.x : d.value.toFixed(2);
            })
            .attr("text-anchor", "middle")
            .style("fill", function (d) {
                return d.x === d.y ? "#000" : color(d.value);
            });

        cor.filter(function (d) {
            return domain.indexOf(d.x) > domain.indexOf(d.y);
        }).append("circle")
            .attr("r", function (d) { return size(Math.abs(d.value)); })
            .style("fill", function (d) {
                return color(d.value);
            });
    }

    render_legend();
});
