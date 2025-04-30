// 設定 SVG 容器尺寸與邊距
const margin = { top: 50, right: 30, bottom: 50, left: 80 };
const width = 1200 - margin.left - margin.right;
const height = 800 - margin.top - margin.bottom;

const svg = d3.select("svg")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// 定義 X 與 Y 軸縮放
const xScale = d3.scaleTime().range([0, width]);
const yScale = d3.scaleLinear().range([height, 0]);

// 定義折線生成器
const lineGenerator = d3.line()
    .x(d => xScale(new Date(d.Date)))
    .y(d => yScale(d.Total));

let data;
let originalData;

// 讀取 CSV 資料
d3.csv("data/all_year.csv", d3.autoType).then(csvData => {
    data = csvData;
    originalData = csvData;
    const dateExtent = d3.extent(data, d => new Date(d.Date));
    document.getElementById("start-date").min = d3.timeFormat("%Y-%m-%d")(dateExtent[0]);
    document.getElementById("start-date").max = d3.timeFormat("%Y-%m-%d")(dateExtent[1]);
    document.getElementById("end-date").min = d3.timeFormat("%Y-%m-%d")(dateExtent[0]);
    document.getElementById("end-date").max = d3.timeFormat("%Y-%m-%d")(dateExtent[1]);
    document.getElementById("start-date").value = d3.timeFormat("%Y-%m-%d")(dateExtent[0]);
    document.getElementById("end-date").value = d3.timeFormat("%Y-%m-%d")(dateExtent[1]);
    updateChart(data);
});

function updateChart(data) {
    // 設定縮放域
    xScale.domain(d3.extent(data, d => new Date(d.Date)));
    yScale.domain([0, d3.max(data, d => d.Total)]);

    // 清除舊的圖表元素
    svg.selectAll("*").remove();

    // 繪製 X 軸
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%Y/%m/%d")))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    // 繪製 Y 軸
    svg.append("g")
        .call(d3.axisLeft(yScale));

    // 繪製折線
    const path = svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("d", lineGenerator);

    const totalLength = path.node().getTotalLength();

    path
        .attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", 0);
    

    // 添加框選功能
    const brush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on("end", updateChartOnBrush);

    svg.append("g")
        .attr("class", "brush")
        .call(brush);

    // 添加 tooltip
    const tooltip = d3.select("#tooltip");

    svg.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(new Date(d.Date)))
        .attr("cy", d => yScale(d.Total))
        .attr("r", 3)
        .attr("fill", "steelblue")
        .on("mouseover", function(event, d) {
            tooltip.style("opacity", 0.9);
        })
        .on("mouseout", function(event, d) {
            tooltip.style("opacity", 0);
        })
        .on("mousemove", function(event, d) {
            const date = new Date(d.Date);
            tooltip.style("left", (event.pageX + 20) + "px")
                .style("top", (event.pageY - 50) + "px")
                .html(`
                    <strong>${d3.timeFormat("%Y/%m/%d")(date)} (${d3.timeFormat("%a")(date)})</strong> <br>
                    ${d.Total.toLocaleString()}
                `);
        });
}

function updateChartOnBrush(event) {
    if (!event.selection) return;

    const [x0, x1] = event.selection.map(xScale.invert);
    const filteredData = data.filter(d => new Date(d.Date) >= x0 && new Date(d.Date) <= x1);

    document.getElementById("start-date").value = d3.timeFormat("%Y-%m-%d")(x0);
    document.getElementById("end-date").value = d3.timeFormat("%Y-%m-%d")(x1);

    // 確保 start date 不會在 end date 之後
    if (x0 >= x1) {
        alert("Start date cannot be on or after end date.");
        d3.select("#start-date").property("value", d3.timeFormat("%Y-%m-%d")(new Date(x1 - 86400000))); // 前一天
        return;
    }

    // 鎖起 end date 以後的日期
    d3.select("#start-date").attr("max", d3.timeFormat("%Y-%m-%d")(new Date(x1 - 86400000))); // 前一天
    // 鎖起 start date 以前的日期
    d3.select("#end-date").attr("min", d3.timeFormat("%Y-%m-%d")(new Date(x0 + 86400000))); // 後一天

    updateChart(filteredData);
}

document.getElementById("start-date").addEventListener("change", () => {
    const startDate = new Date(document.getElementById("start-date").value);
    const endDate = new Date(document.getElementById("end-date").value);
    const filteredData = data.filter(d => new Date(d.Date) >= startDate && new Date(d.Date) <= endDate);

    // 鎖起 start date 以前的日期
    d3.select("#end-date").attr("min", d3.timeFormat("%Y-%m-%d")(new Date(startDate.getTime() + 86400000))); // 後一天

    updateChart(filteredData);
});

document.getElementById("end-date").addEventListener("change", () => {
    const startDate = new Date(document.getElementById("start-date").value);
    const endDate = new Date(document.getElementById("end-date").value);
    const filteredData = data.filter(d => new Date(d.Date) >= startDate && new Date(d.Date) <= endDate);

    // 鎖起 end date 以後的日期
    d3.select("#start-date").attr("max", d3.timeFormat("%Y-%m-%d")(new Date(endDate.getTime() - 86400000))); // 前一天

    updateChart(filteredData);
});

document.getElementById("reset-button").addEventListener("click", () => {
    document.getElementById("start-date").value = d3.timeFormat("%Y-%m-%d")(d3.extent(originalData, d => new Date(d.Date))[0]);
    document.getElementById("end-date").value = d3.timeFormat("%Y-%m-%d")(d3.extent(originalData, d => new Date(d.Date))[1]);
    updateChart(originalData);
});