var stack = (function(config) {
    console.log('version 1.1');

    var stack = {},
        event = d3.dispatch("activate", "deactivate"),
        section = d3.selectAll("section"),
        self = d3.select(window),
        body = document.body,
        root = document.documentElement,
        timeout,
        duration = 250,
        ease = "cubic-in-out",
        screenY,
        size,
        width,
        yActual,
        yFloor,
        yTarget,
        yActive = -1,
        yMax,
        yOffset,
        sectionIds = [],
        aspect = 4/3,
        baseFontSize = 24,
        textScale = 1.5,
        n = section[0].length,

        // css stuff
        style_rules,
        style,
        css,
        head;

    // first add some stylesheets to the DOM
    style_rules = [ 'body { background: #323232; font-family: "Helvetica Neue";}',
            'section { background-size:cover; }',
            'ol, ul { padding: 0% 0% 0% 10%; margin: 2%;}',
            'a { text-decoration: none; }',

            '.stack { background: #fff; color: #111; box-sizing: border-box; -moz-box-sizing: border-box;'+
              '-webkit-box-sizing: border-box; -ms-box-sizing: border-box; -o-box-sizing: border-box;'+
              'display: none; padding: 3%; -webkit-transform: translate3d(0,0,0); }',

            '.center { margin: auto; }',
            '.content { margin: auto; display: block; max-height: 100%; max-width: 100%; }',
            '.active { box-shadow: 0px 4px 8px rgba(0,0,0,.5); display: block; position: fixed; }',
            '.title { padding: 0px; margin: 0px; }'
            ];

    style = document.createElement('style');
    style.setAttribute('type','text/css');

    css = style_rules.join("\n");
    style.appendChild(document.createTextNode(css));

    head = document.getElementsByTagName("head");
    if(head.length == 0) {
            console.log('no head element found, inserting one');
            head = document.createElement("head");
            document.children[0].insertBefore(head,document.children[0].firstChild);
    } else {
        head = head[0];
    }
    head.appendChild(style);

    // Invert the z-index so the earliest sections are on top.
    section.classed("stack", true).style("z-index", function(d, i) { return n - i; });

    // sections can be referred to by number or by id attribute
    section.each(function(d,i) { 
        sectionIds.push(d3.select(this).attr('id') || i.toString())
    });

    // Sets the stack position.
    stack.position = function(yNew) {

        yActive = Math.max(0,+yNew);
        yActive = Math.min(yActive,n-1);

        section.classed("active",function(d,i) { return i == yActive });

        location.replace("#" + sectionIds[yActive]);

        return stack;
    };

    self
            .on("keydown.stack", keydown)
            .on("resize.stack", resize)
            .on("mousewheel.stack", scroll)
            .on("hashchange.stack", hashchange);

    function scroll(e) {
        stack.position(yActive+d3.event.wheelDelta/-120);
    }

    function resize() {
        // calculate section height by height/width of window
        var ref = window.innerHeight*aspect > window.innerWidth ? window.innerWidth : window.innerHeight;
        ref *= .9; // shrink it a bit
        if(window.innerHeight*aspect > window.innerWidth) {
            size = ref*1/aspect;
            width = ref;
        } else {
            size = ref;
            width = ref*aspect;
        }

        yOffset = (window.innerHeight - size) / 2;
        yMax = 1 + yOffset / size;

        // reset the section widths to reflect current browser dimensions
        section.style("width",function(d,i) { return width+'px'; })
        section.style("height",function(d,i) { return size+'px'; })

        //d3.selectAll('p').style({
        d3.select('body').style({
           "font-size":function(d) {
                return baseFontSize*textScale*width/800+"px";
            }
        });

        d3.select(body)
                .style("margin-top", yOffset + "px")
                .style("margin-bottom", yOffset + "px")
                .style("margin-left",(window.innerWidth-width)/2+"px")
                .style("height", n * size + yOffset + "px");
    }

    function hashchange() {
        var hash = location.hash.slice(1),
            sectionId;
        sectionId = sectionIds.indexOf(hash);
        if(sectionId == -1 && !isNaN(+hash)) { sectionId = +hash; }
        stack.position(sectionId);
    }

    function nav_mode() {
        var wborder = window.innerWidth*0.05,
            hborder = window.innerHeight*0.05,
            gridWidth = window.innerWidth-2*wborder,
            gridHeight = window.innerHeight-2*hborder,
            nrows = 5,
            ncols = 5,
            scaleFactor = 0.9,
            makeTransTween = function(d,i,a) {
                var row = Math.floor(i/nrows),
                    col = i%ncols,
                    trans = d3.transform(),
                    dx, dy,
                    br, ew, eh;

                dx = gridWidth/ncols*col-gridWidth/2+2*wborder;
                dy = gridHeight/nrows*row-gridHeight/2+2*hborder;

                trans.translate = [dx, dy];
                trans.scale = [scaleFactor/nrows,scaleFactor/ncols];

                return function(a) {
                    var tweenTrans = d3.transform();
                    tweenTrans.translate = [trans.translate[0]*a+"px",
                                            trans.translate[1]*a+"px"];
                    tweenTrans.scale = [1-(1-trans.scale[0])*a,
                                        1-(1-trans.scale[1])*a];
                    return tweenTrans.toString();
                }
        };

        // move all the sections into a grid, using CSS transforms
        section
            .classed("active",true)
            .transition()
            .ease("linear")
            .duration(150)
            .styleTween("transform", makeTransTween)
            .styleTween("-ms-transform", makeTransTween)
            .styleTween("-webkit-transform", makeTransTween)

        // clicking or mousewheeling ends nav mode
        // FIXME: mouseover and mouseout effects are a little buggy
        section.on({
            "click": function(d,i) {
                section
                  .style({
                    "transform":"",
                    "-ms-transform":"",
                    "-webkit-transform":""
                   })
                  .on({"click":null,
                       "mouseover":null,
                       "mouseout":null
                      });
                stack.position(i);
            },
            "mousewheel": function(d,i) {
                section
                  .style({
                    "transform":"",
                    "-ms-transform":"",
                    "-webkit-transform":""
                   })
                  .on({"click":null,
                       "mouseover":null,
                       "mouseout":null
                      });
            },
            "mouseover": function(d,i) {
                var transStr = d3.select(this).style("transform") ||
                            d3.select(this).style("-ms-transform") ||
                            d3.select(this).style("-webkit-transform"),
                    trans = d3.transform(transStr),
                    makeTransTween = function() {
                        return function(a) {
                            var tweenTrans = d3.transform(),
                                trans = d3.transform(transStr);
                            tweenTrans.scale = [scaleFactor/nrows*(1+.1*a),
                                                scaleFactor/ncols*(1+.1*a)];
                            tweenTrans.translate = [trans.translate[0]+"px",
                                                    trans.translate[1]+"px"];
                            console.log(tweenTrans.toString());
                            return tweenTrans.toString();
                        }
                    };
                // event bubbling and precision issues
                // probably a better way to fix them
                if(Math.abs(trans.scale[0] - scaleFactor/nrows*1.1) > 0.001) {
                    d3.select(this)
                      .transition()
                      .duration(150)
                      .styleTween("transform", makeTransTween)
                      .styleTween("-ms-transform", makeTransTween)
                      .styleTween("-webkit-transform", makeTransTween);
                }
            },
            "mouseout": function(d,i) {
                var transStr = d3.select(this).style("transform") ||
                            d3.select(this).style("-ms-transform") ||
                            d3.select(this).style("-webkit-transform"),
                    trans = d3.transform(transStr),
                    makeTransTween = function() {
                        return function(a) {
                            var tweenTrans = d3.transform(),
                                trans = d3.transform(transStr);
                            tweenTrans.scale = [scaleFactor/nrows*1.1*(1-.1*a/1.1),
                                                scaleFactor/ncols*1.1*(1-.1*a/1.1)];
                            tweenTrans.translate = [trans.translate[0]+"px",
                                                    trans.translate[1]+"px"];
                            return tweenTrans.toString();
                        }
                    };
                // event bubbling and precision issues
                // probably a better way to fix them
                if(Math.abs(trans.scale[0] - scaleFactor/nrows) > 0.001) {
                    d3.select(this)
                      .transition()
                      .duration(150)
                      .styleTween("transform", makeTransTween)
                      .styleTween("-ms-transform", makeTransTween)
                      .styleTween("-webkit-transform", makeTransTween);
                }
            }

        });

    }
    function keydown() {
        var delta = 0;
        switch (d3.event.keyCode) {
            case 39: // right arrow
            if (d3.event.metaKey) return;
            case 40: // down arrow
            case 34: // page down
            delta = d3.event.metaKey ? Infinity : 1; break;
            case 37: // left arrow
            if (d3.event.metaKey) return;
            case 38: // up arrow
            case 33: // page up
            delta = d3.event.metaKey ? -Infinity : -1; break;
            case 32: // space
            delta = d3.event.shiftKey ? -1 : 1; break;
            case 36: // home
            delta = -Infinity; break;
            case 35: // end
            delta = Infinity; break;
            break;
            case 187: // equals goes into nav mode
                nav_mode();
                return;
            break;
            case 83: // s saves as pdf
                /* this doesn't work yet
                var doc = jsPDF('p','in',[6,8]);

                console.log(doc);
                section.each(function() {
                    doc.addPage();
                    console.log(p);
                    doc.fromHTML(this);
                });
                doc.save();
                */
            break;
            default: return;
        }

        stack.position(yActive+delta);

        d3.event.preventDefault();
    }
    d3.rebind(stack, event, "on");

    resize();
    hashchange();

    return stack;
});
