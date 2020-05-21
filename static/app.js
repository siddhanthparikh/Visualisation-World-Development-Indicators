(async function () {
    const pageConfig = {
        home: {
            showYearScale: false,
            showAscendingButton: false,
            showDescendingButton: false,
            showPlayButton: false,
            showAlphabeticalOrderButton: false,
            showAttributeSelect: false,
            showCountrySelect: false,
            displayPlotFunction: () => {},
            prepFunction: () => {},
        },
        mdsPlot: {
            showYearScale: true,
            showAscendingButton: false,
            showDescendingButton: false,
            showPlayButton: true,
            showAttributeSelect: false,
            showCountrySelect: false,
            showAlphabeticalOrderButton: false,
            displayPlotFunction: displayMDSplots,
            prepFunction: () => {},
        },
        linePlot: {
            showYearScale: false,
            showAscendingButton: false,
            showDescendingButton: false,
            showPlayButton: false,
            showAttributeSelect: true,
            showCountrySelect: false,
            showAlphabeticalOrderButton: false,
            displayPlotFunction: displayLineChart,
            prepFunction: prepareLineChart,
        },
        barPlot: {
            showYearScale: true,
            showAscendingButton: true,
            showDescendingButton: true,
            showPlayButton: true,
            showAttributeSelect: true,
            showCountrySelect: false,
            showAlphabeticalOrderButton: true,
            displayPlotFunction: displayBarPlot,
            prepFunction: () => {},
        },
        comovingPlot: {
            showYearScale: true,
            showAscendingButton: false,
            showDescendingButton: false,
            showPlayButton: true,
            showAttributeSelect: false,
            showCountrySelect: false,
            showAlphabeticalOrderButton: false,
            displayPlotFunction: displayComovingPlot,
            prepFunction: comovingPrepFunction,
        },
        parallelPlot: {
            showYearScale: true,
            showAscendingButton: false,
            showDescendingButton: false,
            showPlayButton: true,
            showAttributeSelect: false,
            showCountrySelect: false,
            showAlphabeticalOrderButton: false,
            displayPlotFunction: displayParallelPlot,
            prepFunction: parallelPlotPrepFunction,
        },
        pcaPlot: {
            showYearScale: true,
            showAscendingButton: false,
            showDescendingButton: false,
            showPlayButton: true,
            showAttributeSelect: false,
            showCountrySelect: false,
            showAlphabeticalOrderButton: false,
            displayPlotFunction: displayPcaPlot,
            prepFunction: pcaPlotPrepFunction,
        }
    };
    let pageState=  {
        currentPage: null,
        year: 2000,
        order: '',
        selectedCountries: [],
        setSelectedCountries: (countries) =>{
            if(pageState.playing){
                return;
            }
            countries = countries.sort();
            if(JSON.stringify(countries) == JSON.stringify(pageState.selectedCountries)){
                return;
            }
            pageState.selectedCountries = countries;
            Object.keys(pageState.onCountriesSelected).forEach(f => {
                pageState.onCountriesSelected[f]();
            });
        },
        selectedAttribute: '',
        selectedCountry: '',
        charts: {},
        plotData: null,
        plotFunction: () => {},
        attributeX: '',
        attributeY: '',
        onCountriesSelected: {},
        playing: false,
    }
    let dataState = {
        data: {},
        countries: [],
        attributes: [],
        setData : (path, data) => {
            dataState.data[path] = data; 
        },
        getData : (path) => {
            return dataState.data[path] || null;
        }
    };

    function enforceConfig({showYearScale,showAscendingButton,showDescendingButton,showPlayButton,showAlphabeticalOrderButton, displayPlotFunction, showAttributeSelect, showCountrySelect}){
        document.getElementById('sortAsc').style.display = showAscendingButton ? 'block': 'none';
        document.getElementById('sortDesc').style.display = showDescendingButton ? 'block': 'none';
        document.getElementById('noneDesc').style.display = showAlphabeticalOrderButton ? 'block': 'none';
        document.getElementById('playOperation').style.display = showPlayButton ? 'block': 'none';
        document.getElementById('yearRangeSlider').style.display = showYearScale ? 'block': 'none';
        document.getElementById('attributeSelect').style.display = showAttributeSelect ? 'block': 'none';
        //document.getElementById('countrySelect').style.display = showCountrySelect ? 'block': 'none';
        return displayPlotFunction;
    }
    
    function selectedPage(key) {
        const keys = Object.keys(pageConfig);
        keys.filter(k => k != key).forEach(k => {document.getElementById(key).style.display = 'none'; });
        document.getElementById(key).style.display = 'block';
    }
    
    function setPage(){
        const prepFuncs = [];
        const displayFuncs = [];
        Object.keys(pageConfig).forEach(k =>{
            prepFuncs.push(pageConfig[k].prepFunction);
            displayFuncs.push(pageConfig[k].displayPlotFunction)
        });
        pageState.plotFunction = () => {
            prepFuncs.forEach(f => f());
            displayFuncs.forEach(f => f());
            console.log(pageState.selectedCountries);
        }
        pageState.plotFunction();
    }

    async function getData(path, processingFunction) {
        const response = await fetch(`./${path}`, { method: 'GET' });
        const data = await response.json();
        dataState.setData(path, processingFunction(data));
        return dataState.getData(path); 
    }

    async function loadAllData() {
        let response = await getData('year_frames', data => {
            Object.keys(data).forEach(k => {
                data[k] = JSON.parse(data[k]);
            });
            dataState.attributes = new Set();
            dataState.countries = Object.keys(data[2000]['Country Name']).map(x => data[2000]['Country Name'][x]);
            Object.keys(data).forEach(year => {
                Object.keys(data[year]).filter(x => x!= 'Country Name').forEach(attr => {
                    dataState.attributes.add(attr);
                    let result = [];
                    Object.keys(data[year][attr]).forEach(k => {
                        result.push(({key : dataState.countries[k], value: data[year][attr][k]}));
                    });
                    data[year][attr] = result;
                });
            });
            let attributes = [];
            dataState.attributes.forEach(x => attributes.push(x));
            dataState.attributes = attributes;
            pageState.selectedCountry = dataState.countries[0];
            d3
                .select('#attributeSelect')
                .selectAll('option')
                .data(dataState.attributes)
                .enter()
                .append("option")
                .attr("value", d => d)
                .text(d => d);
            pageState.selectedAttribute = dataState.attributes[0];
            return data;
        });
        response = await getData('mds_frames', x => x);
        response = await getData('pca_frames', x => x);
    }

    async function initApp() {
        setUpEvents();
        await loadAllData();
        setPage();
    }

    function displayPcaPlot() {
        const pca_frames = dataState.data['pca_frames'];
        const data = pca_frames[getCurrentSelectedYear()]['PCA_dims'].map((x, i) => ({key: dataState.countries[i], x: x[0], y: x[1]}));

        const margin = 30;
        const width = 540;
        const height  = 300;
        const {yAxis, xAxis, chartElement, xAxisLabel, yAxisLabel} = setUpCanvas('pcaChart', ({ margin, width, height }));
        xAxisLabel.text('PCA 1');
        yAxisLabel.text('PCA 2');
        const yScale = d3.scaleLinear().range([height, 0]).domain([d3.min(data, ({y}) => y), d3.max(data, ({y}) => y)]);
        yAxis.call(d3.axisLeft(yScale));
        const xScale = d3.scaleLinear().range([0, width]).domain([d3.min(data, ({x}) => x), d3.max(data, ({x}) => x)]);
        xAxis.call(d3.axisBottom(xScale));
        
        const setCircleData = (cirlce) =>{
            return cirlce
                .attr('cx', d => xScale(d['x']))
                .attr('cy', d => yScale(d['y']))
                .attr('fill', (d,i) => pageState.selectedCountries.indexOf(dataState.countries[i]) == -1 ? '#003f5c': '#ffa600')
                .attr("r", 4);
        }

        const setTextData = (text) => {
            return text
                .attr('x', d => xScale(d['x']))
                .attr('y', d => yScale(d['y']) + 0.05)
                .text((d,i) => dataState.countries[i])
                .style("font-size", "9px").attr("alignment-baseline","middle");;
        }

        chartElement
            .selectAll('g')
            .data(data)
            .join(
                enter => {
                    const parentElement = enter.append('g');
                    const circleElement = parentElement.append('circle');
                    const textElement = parentElement.append('text')
                    setCircleData(circleElement);
                    setTextData(textElement);
                },
                update => {
                    let circleElement = update.select('circle');
                    let textElement = update.select('text');
                    circleElement = circleElement
                                        .transition()
                                        .duration(1000)
                    textElement = textElement
                                        .transition()
                                        .duration(1000)
                    setCircleData(circleElement);
                    setTextData(textElement);
                }
                ,exit => {exit.remove()});

        pageState.onCountriesSelected['pcaPlot'] = () => {
            circles
                .attr('fill', (d,i) => pageState.selectedCountries.indexOf(dataState.countries[i]) == -1 ? '#003f5c': '#ffa600');
        }
        const circles = chartElement.selectAll('circle');

        const inside = ({x0, y0, x1, y1}, {x, y, key}) =>{
            x = xScale(x);
            y = yScale(y);
            return (x0 <= x && x1 >= x && y0 <= y && y1 >= y);
        }
        
        const brush = d3.brush()
            .extent([[0,0], [width, height]])
            .on('brush end', () =>{
                if(d3.event.selection == null){return;}
                const selections = [];
                const [[x0, y0], [x1, y1]] = d3.event.selection;
                const keyPoints = {x0, y0, x1, y1};
                circles
                    .each(d => {
                        if(inside(keyPoints, d)){
                            selections.push(d.key);
                        }
                    })
                pageState.setSelectedCountries(selections);
            });

        chartElement
            .append('g')
            .attr('class', 'brush')
            .call(brush)
    }

    function pcaPlotPrepFunction() {

    }

    function displayMDSplots() {
        const data = dataState.data['mds_frames'];
        const mds_plots = data['mds_frames'];
        dataState.countries = data['countries'];
        const response_mds = {};
        Object.keys(mds_plots).forEach(year => { response_mds[year] = mds_plots[year].map(x => ({'x': x[0], 'y': x[1]})); });
        pageState.plotData = response_mds;
        drawMdsPlot();
    }

    function displayLineChart() {
        const year_frames = dataState.data['year_frames'];
        let data  = [];
        let keys = [];
        let values = [];
        const attribute = pageState.selectedAttribute;
        const countries = dataState.countries;
        countries.forEach(key => {
            response = {key};
            for(var i = 2000; i < 2018; i++){
                if(Object.keys(year_frames[i]).indexOf(attribute) != -1){
                    response[i] = year_frames[i][attribute].filter(x => x.key == key)[0].value;
                    values.push(response[i] || 0);
                }
            }
            data.push(response);
        });
        for(var i = 2000; i < 2018; i++){
            keys.push(i);
        }
        const colorDomain = data.map((x,i) => i);

        const margin = 30;
        const width = 540;
        const height  = 300;
        const xScale = d3.scalePoint().range([0, width]).domain(keys);
        const yScale = d3.scaleLinear().range([height, 0]).domain(d3.extent(values));
        const getColor = d3.scaleOrdinal().domain(countries).range(['#003f5c']);

        function path(d) {
            return d3.line()(keys.map((k , i)=> [xScale(k), yScale(d[k])]));
        }

        const {yAxis, xAxis, chartElement,  xAxisLabel, yAxisLabel} = setUpCanvas('lineChart', ({ margin, width, height }));
        xAxisLabel.text("Years")
        yAxisLabel.text(attribute)
        xAxis.call(d3.axisBottom(xScale));
        yAxis.call(d3.axisLeft(yScale));

        const pathFunc = pathElement => {
            return  pathElement
            .attr('d', path)
            .style('fill', 'none')
            .attr('stroke-width', '1.2')
            .style('stroke', x => getColor(x.key))
            .style('opacity', 1)
            // resp
            // .on("mouseover", function(d) {
            //     d3.select(this).style("fill", d3.select(this).attr('stroke'))
            //         .attr('fill-opacity', 0.3);
            //         div.transition()		
            //         .duration(200)		
            //         .style("opacity", .9);		
            //         div	.html(d.key)	
            //             .style("left", (d3.event.pageX) + "px")		
            //             .style("top", (d3.event.pageY - 28) + "px");	
            //   })                  
            //   .on("mouseout", function(d) {
            //     d3.select(this).style("fill", "none")
            //         .attr('fill-opacity', 1);
            //     div.transition()		
            //     .duration(500)		
            //         .style("opacity", 0);
            //   });
        }
        
        chartElement
            .selectAll('g')
            .data(data)
            .join(
                enter => {
                    const parentElement = enter.append('g');
                    const pathElement = parentElement
                        .append('path');
                    pathFunc(pathElement);
                },
                update => {
                    const pathElement = update.select('path')
                        .transition()
                        .duration(1000);
                    pathFunc(pathElement);
                },
                exit => {
                    exit.remove();
                }
            );
        d3.select('#selectedCountries')
            .data(countries)
            .selectAll('div')
            .join(enter =>{
                const divElement = enter.append('div');
                divElement
                    .style("background-color", x => getColor(x))
                    .style("padding", "10px")
                    .text(c => c);
            }, update => {
                const divElement = update.select('div');
                divElement
                    .style("background-color", x => getColor(x))
                    .style("padding", "10px")
                    .text(c => c);
            }, exit =>{ exit.remove();})
    }

    function prepareLineChart() {

    }

    function comovingPrepFunction() {
        const attributes = Object.keys(dataState.data['year_frames'][getCurrentSelectedYear()]).filter(x => x!= 'Country Name');
        ['attributeX', 'attributeY'].map(val => {
            d3
            .select('#'+val)
            .selectAll('option')
            .data(attributes)
            .enter()
            .append('option')
            .attr('value', x => x)
            .text(x => x);
        });
        document.getElementById('attributeX').onchange = (e) => {
            pageState.attributeX = e.target.value;
            pageState.plotFunction();
        }
        document.getElementById('attributeY').onchange = (e) => {
            pageState.attributeY = e.target.value;
            pageState.plotFunction();
        }
        pageState.attributeX = !pageState.attributeX ? attributes[0] : pageState.attributeX;
        pageState.attributeY = !pageState.attributeY ? attributes[0] : pageState.attributeY;
    }

    function parallelPlotPrepFunction() {

    }

    function displayParallelPlot() {
        const year_frames = dataState.data['year_frames'];
        const year = getCurrentSelectedYear();
        let countries = dataState.countries.map(c => c);
        const getTopPCAKeys = dataState.data['pca_frames'][year]['top_attrs']
        const keys = getTopPCAKeys;
        const data = countries.map(c => {
            let result = {
            };
            keys.forEach(x => {
                result[x] = year_frames[year][x].filter(({key}) => key == c)[0].value ;
            });
            return result;
        });

        const margin = 30;
        const width = 540;
        const height  = 300;
        
        const yScales = keys.map(key => {
            return d3.scaleLinear()
                    .domain(d3.extent(data, x => x[key] || 0))
                    .range([height, 0]);
        });
        const xScale = d3.scalePoint().range([0, width]).domain(keys);

        function path(d) {
            return d3.line()(keys.map((k , i)=> [xScale(k), yScales[i](d[k])]));
        }

        const {yAxis, xAxis, chartElement, xAxisLabel, yAxisLabel, yAxes} = setUpCanvas('parallelChart', ({ margin, width, height }), keys);
        xAxisLabel.text("Top 5 PCA loaded attributes") 
        yAxisLabel.text("Countries")
        xAxis.call(d3.axisBottom(xScale));
        yScales.forEach((scale, i) => {
                yAxes[i]
                .call(d3.axisLeft(scale))
                .attr('transform', `translate(${xScale(keys[i])}, 0)`)
        })

        const pathFunc = pathElement => {
            return pathElement
            .attr('d', path)
            .style('fill', 'none')
            .style('stroke', (d, i) => pageState.selectedCountries.indexOf(dataState.countries[i]) == -1 ? '#003f5c': '#ffa600' )
            .style('opacity', 0.5);
        }

        chartElement
            .selectAll('g')
            .data(data)
            .join(
                enter => {
                    const parentElement = enter.append('g');
                    const pathElement = parentElement
                        .append('path');
                    pathFunc(pathElement);
                },
                update => {
                    const pathElement = update.select('path')
                        .transition()
                        .duration(1000);
                    pathFunc(pathElement);
                },
                exit => {
                    exit.remove();
                }
            );
    }

    function displayComovingPlot() {
        const year_frames = dataState.data['year_frames'];
        const year = getCurrentSelectedYear();

        const selectedCountries = new Set();
        const x_values = [];
        const y_values = [];
        for(var i =2000; i < 2018; i++){
            if(year_frames[i][pageState.attributeX]){
                year_frames[i][pageState.attributeX].forEach(({value}) =>{
                    if(value){
                        x_values.push(value);
                    }
                })
            }
            if(year_frames[i][pageState.attributeY]){
                year_frames[i][pageState.attributeY].forEach(({value}) =>{
                    if(value){
                        y_values.push(value);
                    }
                })
            }
        }

        year_frames[year][pageState.attributeX].filter(x => x != null).forEach(x => selectedCountries.add(x.key));
        year_frames[year][pageState.attributeY].filter(x => x != null).forEach(x => selectedCountries.add(x.key));
        const data = [];
        selectedCountries.forEach(key => {
            data.push({key,
                x_value: year_frames[year][pageState.attributeX].filter(x => x.key == key)[0].value,
                y_value: year_frames[year][pageState.attributeY].filter(x => x.key == key)[0].value});
        });

        const margin = 30;
        const width = 540;
        const height  = 300;

        const {yAxis, xAxis, chartElement, xAxisLabel, yAxisLabel} = setUpCanvas('comovingChart', ({ margin, width, height }));
        xAxisLabel.text(pageState.attributeX) 
        yAxisLabel.text(pageState.attributeY)
        const yScale = d3.scaleLinear().range([height, 0]).domain([d3.min(y_values), d3.max(y_values)]);
        yAxis.call(d3.axisLeft(yScale));
        const xScale = d3.scaleLinear().range([0, width]).domain([d3.min(x_values), d3.max(x_values)]);
        xAxis.call(d3.axisBottom(xScale));

        const setCircleData = (cirlce) =>{
            return cirlce
                .attr('cx', d => xScale(d['x_value']))
                .attr('cy', d => yScale(d['y_value']))
                .attr('fill', ({key}) => pageState.selectedCountries.indexOf(key) == -1 ? '#003f5c' : '#ffa600')
                .attr("r", 4);
        }

        const setTextData = (text) => {
            return text
                .attr('x', d => xScale(d['x_value']))
                .attr('y', d => yScale(d['y_value']) + 0.05)
                .text(d => d.key)
                .style("font-size", "9px").attr("alignment-baseline","middle");;
        }

        chartElement
            .selectAll('g')
            .data(data)
            .join(
                enter => {
                    const parentElement = enter.append('g');
                    const circleElement = parentElement.append('circle');
                    const textElement = parentElement.append('text')
                    setCircleData(circleElement);
                    setTextData(textElement);
                },
                update => {
                    let circleElement = update.select('circle');
                    let textElement = update.select('text');
                    circleElement = circleElement
                        .transition()
                        .duration(1000);
                    textElement = textElement
                        .transition()
                        .duration(1000);
                    setCircleData(circleElement);
                    setTextData(textElement);
                }
                ,exit => {exit.remove()});
        
        const circles = chartElement.selectAll('circle');

        pageState.onCountriesSelected['comovingPlot'] = () => {
            circles
            .attr("fill",({key }) => pageState.selectedCountries.indexOf(key) != -1 ? '#ffa600' : '#003f5c' );
        }

        const inside = ({x0, y0, x1, y1}, {x_value, y_value, key}) =>{
            const x = xScale(x_value);
            const y = yScale(y_value);
            return (x0 <= x && x1 >= x && y0 <= y && y1 >= y);
        }
        
        const brush = d3.brush()
            .extent([[0,0], [width, height]])
            .on('brush end', () =>{
                if(d3.event.selection == null){return;}
                const selections = [];
                const [[x0, y0], [x1, y1]] = d3.event.selection;
                const keyPoints = {x0, y0, x1, y1};
                circles
                    .each(d => {
                        if(inside(keyPoints, d)){
                            selections.push(d.key);
                        }
                    })
                pageState.setSelectedCountries(selections);
            });

        chartElement
            .append('g')
            .attr('class', 'brush')
            .call(brush)
    }

    function displayBarPlot() {
        const year_frames = dataState.data['year_frames'];
        const year = getCurrentSelectedYear();
        let data = year_frames[year][pageState.selectedAttribute];
        if(!data){
            data= dataState.countries.map(x => ({key: x, value: 0}));
        }

        if(pageState.order == 'asc'){
            data = data.map(x=> x).sort((a, b) => d3.ascending(a.value || 0, b.value || 0));
        } else if (pageState.order == 'desc'){
            data = data.map(x=> x).sort((a, b) => d3.descending(a.value || 0, b.value || 0));
        }

        const margin = 30;
        const width = 540;
        const height  = 300;

        const {yAxis, xAxis, chartElement, xAxisLabel, yAxisLabel} = setUpCanvas('barChart', ({ margin, width, height }));
        xAxisLabel.text("Countries");
        yAxisLabel.text(pageState.selectedAttribute);
        const yScale = d3.scaleLinear().range([height, 0]).domain([d3.min(data, x => x.value), d3.max(data, x => x.value ) + 2]);
        yAxis
            .transition()
            .duration(1000)
            .call(d3.axisLeft(yScale));

        const xScale = d3.scaleBand().range([0, width]).domain(data.map(x => x.key)).padding(0.2);
        xAxis
            .transition()
            .duration(1000)
            .call(d3.axisBottom(xScale))
            //.attr('transform', `translate(-10, ${yScale(0)})`)
            .selectAll('text')
            .attr('transform', `translate(-20, 25)rotate(-45)`);

        const setRectData = rect => {
            return rect
            .attr('x', s => xScale(s.key))
            .attr('y', s => yScale(s.value))
            .attr('height', s => height - yScale(s.value))
            .attr('width', xScale.bandwidth())
            .style('fill', ({key}) => pageState.selectedCountries.indexOf(key) == -1 ? '#003f5c' : '#ffa600');
        };

        chartElement
            .selectAll('g')
            .data(data)
            .join(enter => {
                const parentElement = enter.append('g');
                const rectElement = parentElement.append('rect');
                setRectData(rectElement);
            }, update => {
                const rectElement = update.select('rect')
                .transition()
                        .duration(1000);
                setRectData(rectElement);
            }, exit => exit.remove());
        
        const rects = chartElement
            .selectAll('rect');
        pageState.onCountriesSelected['barPlot'] = () => {
            rects
                .style('fill', ({key}) => pageState.selectedCountries.indexOf(key) == -1 ? '#003f5c': '#ffa600');
        }

        const inside = ({x0,x1}, {key}) =>{
            x = xScale(key);
            return (x0 <= x && x1 >= x);
        }
        
        const brush = d3.brushX()
            .extent([[0,0], [width, height]])
            .on('brush end', () =>{
                if(d3.event.selection == null){return;}
                const selections = [];
                const [x0, x1] = d3.event.selection;
                const keyPoints = {x0, x1};
                rects
                    .each(d => {
                        if(inside(keyPoints, d)){
                            selections.push(d.key);
                        }
                    })
                pageState.setSelectedCountries(selections);
            });

        chartElement
            .append('g')
            .attr('class', 'brush')
            .call(brush)

    }

    function drawMdsPlot() {
        const year = getCurrentSelectedYear();
        let data = pageState.plotData[year];
        data = data.map((x, i) => {x['key'] = dataState.countries[i]; return x;})

        const margin = 30;
        const width = 540;
        const height  = 300;
        const x_values =[];
        const y_values =[];
        Object.keys(pageState.plotData).forEach(key => {
            pageState.plotData[key].forEach(({x, y}) =>{
                x_values.push(x);
                y_values.push(y);
            });
        })

        const {yAxis, xAxis, chartElement, xAxisLabel, yAxisLabel} = setUpCanvas('mdsChart', ({ margin, width, height }));
        xAxisLabel.text("MDS 1")
        yAxisLabel.text("MDS 2")
        
        const yScale = d3.scaleLinear().range([height, 0]).domain([d3.min(y_values), d3.max(y_values)]);
        yAxis.call(d3.axisLeft(yScale));
        const xScale = d3.scaleLinear().range([0, width]).domain([d3.min(x_values), d3.max(x_values)]);
        xAxis.call(d3.axisBottom(xScale));
        
        const setCircleData = (cirlce) =>{
            return cirlce
                .attr('cx', d => xScale(d['x']))
                .attr('cy', d => yScale(d['y']))
                .attr('fill', (d,i) => pageState.selectedCountries.indexOf(dataState.countries[i]) == -1 ? '#003f5c': '#ffa600')
                .attr("r", 4);
        }

        const setTextData = (text) => {
            return text
                .attr('x', d => xScale(d['x']))
                .attr('y', d => yScale(d['y']) + 0.05)
                .text((d,i) => dataState.countries[i])
                .style("font-size", "9px").attr("alignment-baseline","middle");;
        }

        chartElement
            .selectAll('g')
            .data(data)
            .join(
                enter => {
                    const parentElement = enter.append('g');
                    const circleElement = parentElement.append('circle');
                    const textElement = parentElement.append('text')
                    setCircleData(circleElement);
                    setTextData(textElement);
                },
                update => {
                    let circleElement = update.select('circle');
                    let textElement = update.select('text');
                    circleElement = circleElement
                                        .transition()
                                        .duration(1000)
                    textElement = textElement
                                        .transition()
                                        .duration(1000)
                    setCircleData(circleElement);
                    setTextData(textElement);
                }
                ,exit => {exit.remove()});

        pageState.onCountriesSelected['mdsPlot'] = () => {
            circles
                .attr('fill', (d,i) => pageState.selectedCountries.indexOf(dataState.countries[i]) == -1 ? '#003f5c': '#ffa600');
        }
        const circles = chartElement.selectAll('circle');

        const inside = ({x0, y0, x1, y1}, {x, y, key}) =>{
            x = xScale(x);
            y = yScale(y);
            return (x0 <= x && x1 >= x && y0 <= y && y1 >= y);
        }
        
        const brush = d3.brush()
            .extent([[0,0], [width, height]])
            .on('brush end', () =>{
                if(d3.event.selection == null){return;}
                const selections = [];
                const [[x0, y0], [x1, y1]] = d3.event.selection;
                const keyPoints = {x0, y0, x1, y1};
                circles
                    .each(d => {
                        if(inside(keyPoints, d)){
                            selections.push(d.key);
                        }
                    })
                pageState.setSelectedCountries(selections);
            });

        chartElement
            .append('g')
            .attr('class', 'brush')
            .call(brush)
    }

    function setUpEvents() {
        document.getElementById('myDropDown').style.display = 'none';
        document.getElementById('dropDown').onclick = () => {
            document.getElementById('myDropDown').style.display = document.getElementById('myDropDown').style.display == 'block' ? 'none' : 'block';
        }
        document.getElementById('openNav').onclick = () => {
            document.getElementById('leftNav').style.display = 'block';
        }
        document.getElementById('closeNav').onclick = () => {
            document.getElementById('leftNav').style.display = 'none';
        }
        document.getElementById('selectedYearValue').textContent = getCurrentSelectedYear();
        document.getElementById('yearRangeSlider').onchange = () => {
            document.getElementById('selectedYearValue').textContent = getCurrentSelectedYear();
            pageState.plotFunction();
        };
        document.getElementById('sortAsc').onclick = () => {
            pageState.order = 'asc';
            pageState.plotFunction();
        };
        document.getElementById('sortDesc').onclick = () => {
            pageState.order = 'desc';
            pageState.plotFunction();
        };
        document.getElementById('noneDesc').onclick = () => {
            pageState.order = 'none';
            pageState.plotFunction();
        };
        document.getElementById('attributeSelect').onchange = (e) => {
            pageState.selectedAttribute = e.target.value;
            pageState.plotFunction();
        };
        document.getElementById('playOperation').onclick = () => {
            const callFunc = (value) => {
                if(value == 2018){
                    document.getElementById('yearRangeSlider').value = 2000;
                    document.getElementById('selectedYearValue').textContent = getCurrentSelectedYear();
                    pageState.plotFunction();
                    pageState.playing = false;
                    return;
                }
                document.getElementById('yearRangeSlider').value = value;
                document.getElementById('selectedYearValue').textContent = getCurrentSelectedYear();
                pageState.plotFunction();
                setTimeout(() => callFunc(value + 1), 1100);
            }
            pageState.playing = true;
            callFunc(2000);
        }
    }

    function getCurrentSelectedYear() {
        return document.getElementById('yearRangeSlider').value;
    }
    await initApp();

    function setUpCanvas(elementId, {margin, width, height}, keys) {
        if (Object.keys(pageState.charts).indexOf(elementId) != -1) {
            return pageState.charts[elementId];
        }

        const svgElement = d3.select(`#${elementId}`);
        svgElement
            .attr('width', width + 2 * margin)
            .attr('height', height + 2 * margin + 20)
            .style('background-color', 'white');

        const chartElement = svgElement.append('g');
        chartElement
            .attr('transform', `translate(${margin + 10}, ${margin})`);

        const yAxis = chartElement.append('g');
        const xAxis = chartElement.append('g').attr('transform', `translate(0, ${height})`);
        const chartArea = chartElement.append('g');

        const yAxisLabel = svgElement.append('text');
        yAxisLabel
            .attr('x', -(height / 2) - margin)
            .attr('y', margin / 2.4)
            .attr('transform', 'rotate(-90)')
            .attr('text-anchor', 'middle')
            .style("font-size", "12px");;

        const xAxisLabel = svgElement.append('text');
        xAxisLabel
            .attr('x', width / 2 + margin)
            .attr('y', height + margin +40)
            .attr('text-anchor', 'middle')
            .style("font-size", "12px");
        let yAxes = [];
        if(keys != null){
            yAxes = keys.map(k => {
                return chartElement.append('g');
            })
        }

        const responseObject = {
            svgElement,
            chartElement: chartArea,
            xAxis,
            yAxis,
            chartArea,
            yAxisLabel,
            xAxisLabel,
            parentElement: chartElement,
            yAxes
        };

        pageState.charts[elementId] = responseObject;
        return responseObject;
    }
    // Define the div for the tooltip
    var div = d3.select("body").append("div")	
    .attr("class", "tooltip")				
    .style("opacity", 0);

})();