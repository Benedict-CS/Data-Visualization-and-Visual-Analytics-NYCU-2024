// 設定 SVG 容器尺寸與邊距
const margin = { top: 50, right: 80, bottom: 50, left: 60 };
const width = 1200 - margin.left - margin.right;
const height = 800 - margin.top - margin.bottom;

const svg = d3.select("svg")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// 定義顏色與名稱
const lineInfo = {
    "Yellow": { name: "環狀線", color: "#FFD400" },
    "Blue": { name: "板藍線", color: "#0070BB" },
    "Orange": { name: "中和線", color: "#FFAA33" },
    "Red": { name: "淡水線", color: "#E3002B" },
    "Green": { name: "新店線", color: "#008859" },
    "Brown": { name: "文湖線", color: "#BB7744" }
};

const color = d3.scaleOrdinal()
    .domain(Object.keys(lineInfo))
    .range(Object.values(lineInfo).map(d => d.color));

// 定義縮放
const xScale = d3.scaleTime().range([0, width]);
const yScale = d3.scaleLinear().range([height, 0]);

// 堆疊生成器
const stack = d3.stack().keys(Object.keys(lineInfo));

// 區域生成器
const area = d3.area()
    .x(d => xScale(new Date(d.data.Date)))
    .y0(d => yScale(d[0]))
    .y1(d => yScale(d[1]));

// 加入 tooltip
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// 讀取資料
d3.csv("data/all_year.csv", d3.autoType).then(data => {
    // 設定縮放域
    const dateExtent = d3.extent(data, d => new Date(d.Date));
    xScale.domain(dateExtent);
    yScale.domain([0, d3.max(data, d => 
        Object.values(d).slice(1).pop() * 1.1 // 增加 10% 的空間
    )]);

    // 初始化日期選擇器
    d3.select("#start-date").attr("min", d3.timeFormat("%Y-%m-%d")(dateExtent[0]));
    d3.select("#start-date").attr("max", d3.timeFormat("%Y-%m-%d")(dateExtent[1]));
    d3.select("#end-date").attr("min", d3.timeFormat("%Y-%m-%d")(dateExtent[0]));
    d3.select("#end-date").attr("max", d3.timeFormat("%Y-%m-%d")(dateExtent[1]));
    d3.select("#start-date").property("value", d3.timeFormat("%Y-%m-%d")(dateExtent[0]));
    d3.select("#end-date").property("value", d3.timeFormat("%Y-%m-%d")(dateExtent[1]));
    
    // 加入 brush
    const brush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on("end", updateChart);

    svg.append("g")
        .attr("class", "brush")
        .call(brush);

    // 堆疊資料
    const stackedData = stack(data);

    function mouseMove(event, d) {
        const date = xScale.invert(d3.mouse(this)[0]);
        const passengers = data.find(d => d.Date.getFullYear() === date.getFullYear() && d.Date.getMonth() === date.getMonth() && d.Date.getDate() === date.getDate());
        const weekday = d3.timeFormat("%a")(date); // 取得星期幾
        tooltip.transition()
            .duration(200)
            .style("opacity", .9);
        tooltip.html(`<strong>${d3.timeFormat("%Y/%m/%d")(date)} (${weekday})</strong><br>人次: ${passengers["Total"].toLocaleString()}`)
            .style("left", (d3.event.pageX + 10) + "px")
            .style("top", (d3.event.pageY - 28) + "px");
    }

    // 繪製堆疊區域
    svg.selectAll(".layer")
        .data(stackedData)
        .join("path")
        .attr("class", "layer")
        .attr("fill", d => color(d.key))
        .attr("d", area)
        .on("mousemove", (event, d) => {
            const date = xScale.invert(event.offsetX - margin.left);
            const passengers = data.find(d => d.Date.getFullYear() === date.getFullYear() && d.Date.getMonth() === date.getMonth() && d.Date.getDate() === date.getDate());
            const weekday = d3.timeFormat("%a")(date); // 取得星期幾
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`<strong>${d3.timeFormat("%Y/%m/%d")(date)} (${weekday})</strong><br>${lineInfo[d.key].name}<br>人次: ${passengers[d.key].toLocaleString()}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", (d) => {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })
        .transition()
        .duration(1000)
        .attr("d", area);

    // 加入白底長方形
    svg.append("rect")
        .attr("x", -margin.left)
        .attr("y", -margin.top)
        .attr("width", margin.left)
        .attr("height", height + margin.top + margin.bottom)
        .attr("fill", "white");

    svg.append("rect")
        .attr("x", width)
        .attr("y", -margin.top)
        .attr("width", margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("fill", "white");

    // 繪製 X 軸
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .attr("class", "x-axis")
        .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%Y/%m/%d")))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    // 繪製 Y 軸
    svg.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(yScale));

    // 加入圖例
    const legend = svg.append("g")
        .attr("transform", `translate(${width + 10}, 0)`);

    legend.selectAll("rect")
        .data(Object.keys(lineInfo))
        .join("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 25)
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", d => lineInfo[d].color);

    legend.selectAll("text")
        .data(Object.keys(lineInfo))
        .join("text")
        .attr("x", 20)
        .attr("y", (d, i) => i * 25 + 12)
        .text(d => lineInfo[d].name)
        .style("font-size", "16px")
        .attr("alignment-baseline", "middle");

    // 更新圖表
    function updateChart(event) {
        const extent = event.selection;
        if (!extent) return;

        const selectedRange = extent.map(xScale.invert);
        xScale.domain(selectedRange);

        svg.selectAll(".layer")
            .transition()
            .duration(1000)
            .attr("d", area);

        svg.select(".x-axis")
            .transition()
            .duration(1000)
            .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%Y/%m/%d")));

        d3.select(".brush").call(brush.move, null);

        // 更新日期選擇器
        d3.select("#start-date").property("value", d3.timeFormat("%Y-%m-%d")(selectedRange[0]));
        d3.select("#end-date").property("value", d3.timeFormat("%Y-%m-%d")(selectedRange[1]));
        

        // 鎖起 end date 以後的日期
        d3.select("#start-date").attr("max", d3.timeFormat("%Y-%m-%d")(new Date(selectedRange[1].getTime() - 86400000))); // 前一天

        // 鎖起 start date 以前的日期
        d3.select("#end-date").attr("min", d3.timeFormat("%Y-%m-%d")(new Date(selectedRange[0].getTime() + 86400000))); // 後一天
    }

    // 更新選擇時間
    function updateDateRange() {
        const startDate = new Date(d3.select("#start-date").property("value"));
        const endDate = new Date(d3.select("#end-date").property("value"));

        // 確保 start date 不會在 end date 之後
        if (startDate >= endDate) {
            alert("Start date cannot be on or after end date.");
            d3.select("#start-date").property("value", d3.timeFormat("%Y-%m-%d")(new Date(endDate.getTime() - 86400000))); // 前一天
            return;
        }

        // 鎖起 end date 以後的日期
        d3.select("#start-date").attr("max", d3.timeFormat("%Y-%m-%d")(new Date(endDate.getTime() - 86400000))); // 前一天

        // 鎖起 start date 以前的日期
        d3.select("#end-date").attr("min", d3.timeFormat("%Y-%m-%d")(new Date(startDate.getTime() + 86400000))); // 後一天

        xScale.domain([startDate, endDate]);

        svg.selectAll(".layer")
            .transition()
            .duration(1000)
            .attr("d", area);

        svg.select(".x-axis")
            .transition()
            .duration(1000)
            .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%Y/%m/%d")));

        // 更新 y 軸範圍
        const filteredData = data.filter(d => new Date(d.Date) >= startDate && new Date(d.Date) <= endDate);
        yScale.domain([0, d3.max(filteredData, d => 
            Object.values(d).slice(1).pop() * 1.1 // 增加 10% 的空間
        )]);

        svg.select(".y-axis")
            .transition()
            .duration(1000)
            .call(d3.axisLeft(yScale));
    }

    d3.select("#start-date").on("change", updateDateRange);
    d3.select("#end-date").on("change", updateDateRange);

    // 重置圖表
    d3.select("#reset-button").on("click", () => {
        xScale.domain(dateExtent);

        svg.selectAll(".layer")
            .transition()
            .duration(1000)
            .attr("d", area);

        svg.select(".x-axis")
            .transition()
            .duration(1000)
            .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%Y/%m/%d")));

        yScale.domain([0, d3.max(data, d => 
            Object.values(d).slice(1).pop() * 1.1 // 增加 10% 的空間
        )]);

        svg.select(".y-axis")
            .transition()
            .duration(1000)
            .call(d3.axisLeft(yScale));

        d3.select("#start-date").property("value", d3.timeFormat("%Y-%m-%d")(dateExtent[0]));
        d3.select("#end-date").property("value", d3.timeFormat("%Y-%m-%d")(dateExtent[1]));
    });
});