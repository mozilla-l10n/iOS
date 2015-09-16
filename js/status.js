/* global d3 */
var bug = /bug=([0-9]+)/.exec(document.location.search)[1];
var bugs, events, resolutions = {}, layers;

$.getJSON('https://bugzilla.mozilla.org/rest/bug', 
    {
        include_fields:'id,summary,component,status,resolution,creation_time,cf_last_resolved',
        blocks:bug
        }
).done(processData);

function processData(data) {
    bugs = data.bugs;
    events = [];
    bugs.forEach(function (_b) {
        var l1 = /\[([^\]]+)\]/.exec(_b.summary)[1];
        var l2 = /^([^ ]+)/.exec(_b.component)[1];
        if (l1 !== l2) {
            console.log(l1, l2, _b);
        }
        _b.locale = l2;
        _b.creation_time = d3.time.format.iso.parse(_b.creation_time);
        if (!_b.resolution) {
            _b.resolution = 'OPEN';
        }
        resolutions[_b.resolution] = 0;
        events.push({
            locale: l2,
            when: _b.creation_time,
            state: 'OPEN'
        });
        if (_b.cf_last_resolved) {
            _b.cf_last_resolved = d3.time.format.iso.parse(_b.cf_last_resolved);
            events.push({
                locale: l2,
                when: _b.cf_last_resolved,
                state: _b.resolution
            });
        }
    });
    events.sort(function(l, r) {
        return l.when - r.when;
    });
    console.log('got data');
    showGraph();
    listBugs();
}

function showGraph() {
    for (var res in resolutions) {
        if (resolutions.hasOwnProperty(res)) {
            resolutions[res] = 0;
        }
    }
    layers = Object.keys(resolutions).map(function(res) {
        var cnt = 0;
        return {
            label: res,
            values: events.map(function(e) {
                if (e.state === res) {
                    ++cnt;
                }
                return cnt;
            })
        };
    });
    var options = {xmargin: 40, ymargin: 40};
    var selector = '#graph';
    var t = $(selector),
    width = +(t.css("width").replace('px', '')) - options.xmargin,
    height = +(t.css("height").replace('px', '')) - 2*options.ymargin;
  var x = d3.time.scale()
      .range([0, width]);

  var y = d3.scale.linear()
      .range([height, 0]);
      
      var color = d3.scale.category10();

  var xAxis = d3.svg.axis().scale(x).orient("bottom"),
      yAxis = d3.svg.axis().scale(y).orient("left");

  var svg = d3.select(selector).html('').append("svg")
      .attr("width", width + options.xmargin)
      .attr("height", height + 2*options.ymargin)
      .attr("class", "progress")
      .append("g")
      .attr("transform", "translate(" + options.xmargin + "," + options.ymargin + ")");

  // Add the x-axis.
  svg.append("svg:g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")");
  // Add the y-axis.
  svg.append("svg:g")
    .attr("class", "y axis");
  x.domain([d3.min(events, function(e){return e.when}), d3.max(events, function(e){return e.when})]);
  x.nice();
  y.domain([0, bugs.length]).nice();
  color.domain(Object.keys(resolutions));
  svg.select("g.x.axis").call(xAxis);
  svg.select("g.y.axis").call(yAxis);
    var line = d3.svg.line()
        .interpolate('step-after')
        .x(function(d, i) {
            return x(events[i].when);
        })
        .y(function(d, i) {
            return y(d);
        });
    layers.forEach(function(layer) {
        svg.append("path")
      .datum(layer.values)
      .attr("class", "bugcount")
      .attr("title", layer.label)
      .style("stroke", function(d) { return color(layer.label); })
      .attr("d", line);
    });
}

function listBugs() {
    var l2i = {};
    var shipping = [], not = [];
    bugs.forEach(function(_b, i) {
        l2i[_b.locale] = i;
        if (_b.resolution === 'FIXED') {
            shipping.push(_b.locale);
        }
        else {
            not.push(_b.locale);
        }
    });
    shipping.sort();
    not.sort();
    function createLinks(target, locs) {
        target = $('#' + target);
        locs.forEach(function (locale) {
            $('<a>').text(locale).attr('href', 'https://bugzil.la' + bugs[l2i[locale]].id).appendTo(target);
            target.append(document.createTextNode(' '));
        });
    }
    createLinks('shipping', shipping);
    createLinks('not', not);
}