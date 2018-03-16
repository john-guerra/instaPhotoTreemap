/* global d3: false, getUrlForPhoto: false, $: false */
/*jslint browser: true, indent: 4 */


function TreeMap(htmlID) {
    "use strict";
    var self = this,
        width, height,
        color = d3.scale.category20c(),
        treemap,
        fScale,
        div,
        grandparent,
        oldDepth,
        transitioning = false,
        breadCrumsHtmlID = "#breadCrums",
        accumulateValue = false,
        value = "value",
        labelValue = "value",
        showLabel = function (d) { return true; },
        label = "label",
        sort = value,
        filter = function (d) { return d; };

    self.margin = {top: 0, right: 0, bottom: 0, left: 0};
    self.padding = 0;

    var currentDepth = 0;
    var TEXT_HEIGHT = 40;
    var MIN_SIZE_FOR_TEXT = 100;

    self.chainedAnimations = false;
    self.animationDuration = 750;
    self.zoomable = false;
    self.showPhotos = true;
    self.growable = false;

    var x = d3.scale.linear()
        .domain([0, width])
        .range([0, width]);

    var y = d3.scale.linear()
        .domain([0, height])
        .range([0, height]);

    fScale = d3.scale.linear()
        .domain([10, 30000])
        .range([0.7, 10.0]);

    treemap = getTreemap();

    self.treemap = treemap;

    self.breadCrumsHtmlID = function(_) {
      if (!arguments.length) return breadCrumsHtmlID;
      breadCrumsHtmlID = _;
      return self;
    };

    self.sort = function(_) {
      if (!arguments.length) return sort;
      sort = _;
      return self;
    };

    self.value = function(_) {
      if (!arguments.length) return value;
      value = _;
      return self;
    };

    self.label = function(_) {
      if (!arguments.length) return label;
      label = _;
      return self;
    };

    self.accumulateValue = function(_) {
      if (!arguments.length) return accumulateValue;
      accumulateValue = _;
      return self;
    };

    self.labelValue = function(_) {
      if (!arguments.length) return labelValue;
      labelValue = _;
      return self;
    };

    self.filter = function(_) {
      if (!arguments.length) return filter;
      filter = _;
      return self;
    };

    self.showLabel = function(_) {
      if (!arguments.length) return showLabel;
      showLabel = _;
      return self;
    };

    function getTreemap() {
        if (self.zoomable) {
            return d3.layout.treemap()
                // treemap
                .padding(0)
                .value(function (d) { return d[value]; })
                .children(function(d, depth) { return depth ? null : filter(d._children); })
                // .sort(function(a, b) { return a[value] - b[value]; })
                // .sort(function (a, b) { return d3.descending(a[sort], b[sort]); })
                .sort(function (a, b) { return d3.ascending(a[sort], b[sort]); })
                // .ratio(height / width * 0.5 * (1 + Math.sqrt(5)))
                .ratio(1) //squares
                .round(false);
        } else {
            return d3.layout.treemap()
               .padding(5)
                .children(function(d) { return filter(d.children); })
                .value(function (d) { return d[value]; })
                .sort(function (a, b) { return d3.ascending(a[value], b[value]); });

        }
    }

   //Alex grande answer in http://stackoverflow.com/questions/5999998/how-can-i-check-if-a-javascript-variable-is-function-type
    function isFunction(functionToCheck) {
        var getType = {};
        return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
    }

    self.loading = function () {
        div.select("#spinner").style("display", "inline");
    };

    self.init = function () {

        div = d3.select(htmlID).append("div")
            .attr("id", "innerTreeMap");

        div.append("div")
            .attr("id", "spinner")
            .style("position", "absolute")
            .append("div")
            .attr("id", "spinnerBG");

        div.select("#spinner")
            .append("img")
            .attr("src", "img/spinner.gif")
            .style("display", "inline")
            .style("position", "absolute");


        if (self.zoomable) {
            // grandparent = div.append("div")
                // .attr("class", "grandparent node");

        }

        self.updateWindowSizes();


        self.loading();
    };

    self.updateWindowSizes = function () {
        width = (self.width !== undefined ? self.width : document.getElementById(htmlID.slice(1)).offsetWidth) - self.margin.left - self.margin.right;
        height = (self.height !== undefined ? self.height :  $(window).height()) - self.margin.top - self.margin.bottom;

        x.domain([0, width])
        .range([0, width]);

        y.domain([0, height])
        .range([0, height]);


        div.style("position", "relative")
            .style("width", (width + self.margin.left + self.margin.right) + "px")
            .style("height", (height + self.margin.top + self.margin.bottom) + "px")
            .style("left", self.margin.left + "px")
            .style("top", self.margin.top + "px");


        div.select("#spinnerBG")
                .style("width", (width ) + "px")
                .style("height", (height ) + "px")
                .style("left", "0px")
                .style("top", "0px" );


        div.select("#spinner img")
            .style("left", (self.margin.left + width/2) + "px")
            .style("top", (self.margin.top +  height/2) + "px");

        if (self.zoomable) {
            // grandparent.style("padding", "5px 0px 0px 5px")
            //     .style("top", "-30px")
            //     .style("left", "0px")
            //     .style("width", (width - 5) + "px")
            //     .style("height", "30px")
            //     .style("background-color", "orange");
        }
        treemap.size([width, height]);
    };

    self.update = function (root) {
        div.select("#spinner")
            .style("display", "none");

        if (root !== undefined)
            self.root = root;

        if (self.zoomable) {
            treemap = getTreemap();

            initialize(self.root);
            accumulate(self.root);
            layout(self.root);
        }

        //Draw, then animate
        var node = updateHelper(self.root);
        updateImg(node);
        node.transition()
            .duration(750)
            .call(position);

        // nodeUpdate(node);
        // jumpInto(self.root);
    };

    function initialize(root) {
        root.x = root.y = 0;
        root.dx = width;
        root.dy = height;
        root.depth = 0;
    }

    // Aggregate the values for internal nodes. This is normally done by the
    // treemap layout, but not here because of our custom implementation.
    // We also take a snapshot of the original children (_children) to avoid
    // the children being overwritten when when layout is computed.
    function accumulate(d) {
        var filteredChildren = filter(d.children);
        if (filteredChildren && filteredChildren.length !== 0) {
            d._children = d.children;
            var accum = filter(d.children).reduce(function(p, v) { return p + accumulate(v); }, 0);
            if (accumulateValue) {
                d[value] = accum;
            }
        }
        return d[value];
    }

    // Compute the treemap layout recursively such that each group of siblings
    // uses the same size (1×1) rather than the dimensions of the parent cell.
    // This optimizes the layout for the current zoom state. Note that a wrapper
    // object is created for the parent node for each group of siblings so that
    // the parent’s dimensions are not discarded as we recurse. Since each group
    // of sibling was laid out in 1×1, we must rescale to fit using absolute
    // coordinates. This lets us use a viewport to zoom.
    function layout(d) {
        if (filter(d._children)) {
          treemap.nodes({_children: d._children});
          filter(d._children).forEach(function(c) {
            c.x = d.x + c.x * d.dx;
            c.y = d.y + c.y * d.dy;
            c.dx *= d.dx;
            c.dy *= d.dy;
            c.parent = d;
            layout(c);
          });
        }
    }



    function name(d) {
        return d.parent!== undefined ?
            name(d.parent) + "." + d[label] :
            d[label];
    }




    function nodeEnter(sel) {
        // console.log("Node Enter");
        var nodeDiv = sel.enter()
            .append("div")
            .attr("class", function (d) { return "node treemapNode treemapNode" + d.id; })
            .classed("leaf", function (d) { return filter(d.children) || filter(d._children) ?  false : true; })
            .attr("id", function (d) { return "node" + d.id; })
            .on("mouseover", function (d, i) {
                console.log(d);
                if (filter(d.children)) { //don't hover on parents
                    return;
                }
                if (d.onMouseOver) {
                    return d.onMouseOver(d, i, this);
                } else {
                    // d3.select("#albums").classed("selected", true);
                    d3.select(htmlID).classed("selected", true);
                    d3.selectAll(".treemapNode"+d.id).classed("selected", true);
                    if (self.growable) {
                        growNode(d, i, this);
                    }
                }
            })
            .on("mouseout", function (d, i) {
                if (filter(d.children)) { //don't hover on parents
                    return;
                }
                if (d.onMouseOut) {
                    return d.onMouseOut(d, i, this);
                } else {
                    // d3.select("#albums").classed("selected", false);
                    d3.select(htmlID).classed("selected", false);
                    d3.selectAll(".treemapNode").classed("selected", false);
                   if (self.growable) {
                       shrinkNode(d, i, this);
                   }
                }
            })
            .on("click", function (d, i) {
                if (filter(d.children)) { //for parents remove pointer events
                    return;
                }
                if (self.zoomable) {
                    if ( d._children ) {
                        jumpInto(d);
                    } else {
                        if (d.onClick) {
                            return d.onClick(d, i, this);
                        } else {
                            if (d3.event.shiftKey && d.sUrl) {
                                window.open(d.sUrl,'_blank');
                            } else if (d.url) {
                                window.open(d.url,'_blank');
                            }
                        }
                    }
                } else {
                    if (d.onClick) {
                        return d.onClick(d, i, this);
                    } else {
                        if (d3.event.shiftKey && d.sUrl) {
                            window.open(d.sUrl,'_blank');
                        } else if (d.url) {
                            window.open(d.url,'_blank');
                        }
                    }

                }
            })
            .each(function (d) {
                d.position = position;
                if (filter(d.children)) { //for parents remove pointer events
                    d3.select(this)
                        .style("pointer-events", "none")
                        .selectAll("*").remove();
                }
            })
            .style("width", "0px")
            .style("height", "0px");


        nodeDiv.each(function (d) {
            if (filter(d.children)) {//Do not add the nodeText to the parent nodes
                return;
            }

            var nodeDiv = d3.select(this);

            nodeDiv.append("div")
                .attr("class", "nodeBG");

            nodeAppendText(nodeDiv);
        });

        if (self.animationDuration) {
            nodeDiv = nodeDiv.transition();
        }
        nodeDiv
            .call(position);
    } //nodeEnter




    function nodeUpdate(sel) {
        // nodeDiv.call(position);
        // console.log("Node Update");
        // sel.selectAll(".node")
        // sel.selectAll(".node")
        sel
            // .data(treemap.nodes)
            .classed("leaf", function (d) { return filter(d.children) || filter(d._children) ?  false : true; });

        // if (self.animationDuration) {
        //     sel = sel.transition();
        // }

        //Delete the labels from the ones that don't need it
        sel
            .filter(function (d) { return !showLabel(d); })
            .select(".nodeText")
            .remove();

        //Append the labels to the ones that need it
        // sel
        //     .filter(function (d) { 
        //         return showLabel(d) && !filter(d.children); 
        //     })
        //     .call(nodeAppendText);


        sel
            .call(position);

        d3.selectAll(".node").select(".nodeTextTitle")
            .html(function (d) {
                    return filter(d.children) ? null : d[label];
                });
        d3.selectAll(".node").select(".nodeTextValue")
            .html(function (d) {
                    return filter(d.children) ? null : d[labelValue];
                });
            // .transition()
            // .duration(1500)
            // .style("font-size", function (d) { return d.children ? null : fScale(d[value]) + "em"; });
    } // nodeUpdate

    function nodeExit(sel) {
        // console.log("Node Exit");
        var nExit = sel.exit();
            // .style("opacity", "1")
            // .transition()
            // .duration(self.animationDuration !== undefined ? self.animationDuration: 750)
            // .style("opacity", 0);

        nExit.selectAll("*").remove();
        nExit.remove();
        // node.select(".nodeText").remove();
    } //nodeExit

    function nodeAppendText(sel) {
        sel
            .filter(showLabel)
            .append("div")
            .attr("class", "nodeText")
            // .style("font-size", function (d) {
            //     return d.children ? null : fScale(d[value]) + "em";
            // })
            .append("span")
            .attr("class", "nodeTextContainer")
            .append("div")
            .attr("class", "nodeTextTitle")
            .html(function (d) {
                return filter(d.children) ? null : d[label];
            });
        sel.select(".nodeTextContainer")
            .append("div")
            .attr("class", "nodeTextValue")
            .html(function (d) {
                return filter(d.children) ? null : d[labelValue];
            });        
    }



    function jumpInto(d) {
        var node = d;

        if (node.oldX) node.x = node.oldX;
        if (node.oldY) node.y = node.oldY;
        if (node.oldDx) node.dx = node.oldDx;
        if (node.oldDy) node.dy = node.oldDy;

        // //Disable the nodes from the old root
        // if (d.children) {
        //     d.children.forEach(disable);
        // }
        // disable(d);

        //Avoid jumping to more than one level depth at a time
        while (node.depth > currentDepth + 1) {
            node = node.parent;
        }
        jumpIntoHelper(node);
    }

    function addBaseDepth(d) {
        return div.insert("div", ".grandparent")
            .datum(d, function (d) { return d.id; })
            .attr("class", "depth");
    }

    var jumpIntoHelper = function (d) {
        if (transitioning || !d) return;
        currentDepth = d.depth;
        transitioning = true;
        console.log("transitioning");
        console.log(d);


        // grandparent
        //         .datum(d.parent, function (d) { return d.id; })
        //         .on("click", jumpIntoHelper)
        //         .text(name(d));


        var t1 ;
        if (oldDepth === undefined) {
            oldDepth = d3.selectAll(".depth");
        }
        t1 = oldDepth.transition().duration(750);

        //Mark the old depth as .oldDepth before creating the new depth
        d3.select(".depth").attr("id", "oldDepth");
        // oldDepth = d3.select(".depth").attr("id", "oldDepth");

        oldDepth = addBaseDepth(d);//The selection where the animation will work

        var g2 = updateHelper(d, oldDepth);
        var t2 = g2.transition().duration(750);

        // Update the domain only after entering new elements.
        x.domain([d.x, d.x + d.dx]);
        y.domain([d.y, d.y + d.dy]);

        // // Enable anti-aliasing during the transition.
        // svg.style("shape-rendering", null);

        // // Draw child nodes on top of parent nodes.
        div.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth; });

        // // Fade-in entering text.
        // g2.selectAll("text").style("fill-opacity", 0);

        // Transition to the new view.
        // t1.selectAll("text").call(text).style("fill-opacity", 0);
        // t2.selectAll("text").call(text).style("fill-opacity", 1);
        t1.selectAll(".node").call(position);
        t2.call(position);

        // nodeUpdate();
        t1.selectAll(".node").select(".nodeBG").style("opacity", 0);
        t1.selectAll(".node").style("opacity", 0);
        t2.select(".nodeBG").style("opacity", 1);
        // // Remove the old node when the transition is finished.
        t1.remove().each("end", function(sel) {
            // svg.style("shape-rendering", "crispEdges");
            transitioning = false;
            //Update the image after the animation ends
            console.log("Transition finished");
            // g2.call(position);
            // console.log(sel);
        });
    }; //transition

    var drawBreadCrum = function (d) {
        var pathList = [];
        var tmpNode = d;

        //Create a list with all the ancestors of the current node d
        while (tmpNode !== undefined) {
            pathList.push(tmpNode);
            tmpNode = tmpNode.parent;
        }

        var breadCrums = d3.select(breadCrumsHtmlID)
            .selectAll(".breadCrum")
            .data(pathList.reverse());

        breadCrums.enter()
            .append("span")
            .attr("class", "breadCrum");
        breadCrums
            .on("click", jumpIntoHelper)
            .text(function (d, i) { return d[label].charAt(0).toUpperCase() + d[label].slice(1); })
            .each(function (d, i) {
                if (i < ( pathList.length - 1 )) {
                    d3.select(this)
                        .append("img")
                        .attr("src", "img/breadCrumArrow.png")
                        .attr("class", "breadCrumArrow");
                }
            });


        breadCrums.exit()
            .remove();
    };

    var updateHelper = function (d, selection, doUpdate) {
        transitioning = false;
        self.currentRoot = d;

        drawBreadCrum(d);

        doUpdate = doUpdate === undefined ? true : doUpdate;

        d3.select("body").on("keydown", function (e) {
            if (self.zoomable && d3.event.keyCode===27) {
                jumpInto(self.currentRoot.parent !== undefined ? self.currentRoot.parent : self.root);
            }
        });

        //If not selection given use the current div
        if (selection === undefined) {
            if (self.zoomable) {
                //Try getting the oldDepth
                if (oldDepth === undefined) {
                    oldDepth = d3.selectAll(".depth");
                }

                //If there are no current depth create it
                if (oldDepth[0].length === 0 ) {
                    oldDepth = addBaseDepth(d);
                }

                selection = oldDepth;
            } else {
                selection = div;
            }
        }


        var nodes;

        if(self.zoomable) {
            nodes = filter(d._children);
        } else {
            nodes = treemap.nodes(d);
        }

        var node = selection.selectAll(".node")
           .data(nodes, function (d) {
                return d.path + d.id;
            });
            // .data(nodes);

        // Draw child nodes on top of parent nodes.
        selection.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth; });

        fScale.domain(d3.extent(nodes, function (d) {
            return d[value];
        }));

        if (self.chainedAnimations) {
            //Chain the events nicely
            d3.transition().duration(500).each(function () {
                //Exit
                nodeExit(node);
            }).transition().duration(500).each(function () {
                //Update
                nodeUpdate(node);
            }).transition().duration(500).each(function () {
                //Enter
                nodeEnter(node);
            });
        } else {
            nodeExit(node);
            // TODO Find a better fix
            nodeUpdate(node);
            nodeEnter(node);
        }


        return node;
    }; //updateHelper

    //Animate a node to make it grow to show the whole photo
    function growNode(n, i, ele) {
        // console.log("grow n.id" + n.id);
        var imageSrc = d3.select(ele)
            .select(".nodeBG")
                .style("background-image")
                .replace(/url\((['"])?(.*?)\1\)/gi, '$2')
                .split(',')[0];

        // I just broke it up on newlines for readability
        var image = new Image();
        image.src = imageSrc;

        var width = image.width,
            height = image.height;

        var ratio = width/height;


        // if (n.dx > width) {
        //     width = n.dx;
        //     height = width/ratio;
        // }
        // if (n.dy > height) {
        //     height = n.dy;
        //     width = ratio*height;
        // }

        // console.log("children " + n.label + " id " + n.id + " x = " + n.x + " dx " + n.dx + " i " + n.i);
        n.oldDx = n.dx;
        n.oldDy = n.dy;
        n.oldX = n.x;
        n.oldY = n.y;
        n.dx = x.invert(image.width + x(n.x)) - n.x;
        n.dy = y.invert(image.height + y(n.y)) - n.y;
        // n.x = n.oldX - (n.dx - n.oldDx) / 2;
        // n.y = n.oldY - (n.dy - n.oldDy) / 2;


        d3.select(ele)
            .transition()
            .delay(100)
            .call(position);

    }

    //Animate a node to make it shrink back to normal
    function shrinkNode(n, i, ele) {
        // console.log("shrink n.id" + n.id);
        n.dx = n.oldDx;
        n.dy = n.oldDy;
        n.x = n.oldX;
        n.y = n.oldY;
        n.oldX = n.oldY = n.oldDx = n.oldDy = undefined;

        d3.select(ele).transition().call(position);
    }

    var updateImg = function (sel) {
        // console.log("updateImg");
        sel.select(".nodeBG")
            .style("background-image", function (d) {
                // if (d.children)
                //     return null;
                if (self.showPhotos && d.img) {
                    if (isFunction(d.img)) {
                        return "url(" + String(d.img(Math.max(
                            x(d.x + Math.max(0, d.dx )) - x(d.x),
                            y(d.y + Math.max(0, d.dy )) - y(d.y) ))) + ")";
                    } else {
                        return "url("+ String(d.img) + ")";
                    }
                } else {
                    return "";
                }
            });
        };

    var position = function (sel) {
        var originalSel = sel;

        if (self.animationDuration!== undefined && self.animationDuration !== 0) {
            sel = sel.transition()
                .duration(self.animationDuration!== undefined ? self.animationDuration: 750);
        }

        //After transition if any
        sel
            .style("left", function(d) { return x(d.x) + self.padding + "px"; })
            .style("top", function(d) { return y(d.y) + self.padding  + "px"; })
            .style("width", function(d) { return  x(d.x + Math.max(0, d.dx )) - x(d.x) -  self.padding + "px"; })
            .style("height", function(d) { return y(d.y + Math.max(0, d.dy )) - y(d.y) -  self.padding + "px"; });
        sel.select(".nodeBG")
            // .style("background-size", function (d) {
            //         return Math.max(0, d.dx - 1) + "px " + Math.max(0, d.dy - 1) + "px";
            //     })
            .style("background-color", function (d) { return filter(d.children) ? null : color(d[label]); });

        sel.select(".nodeText")
            .style("position", "relative");
            // .style("visibility", function (d) { return  (d.dx < MIN_SIZE_FOR_TEXT) ? "hidden" : "visible"; })
            // .style("left", function(d) { return (x(d.x + d.dx) - x(d.x) / 2)  + "px"; })

        if (self.zoomable) {
            sel.select(".nodeText")
                .style("left", function(d) { return 0  + "px"; })
                .style("top", function(d) { return  ((y(d.y + d.dy) - y(d.y)) / 2  - TEXT_HEIGHT) + "px"; })
                .style("height", TEXT_HEIGHT + "px");
        } else {
            sel.select(".nodeText")
                .style("left", function(d) { return 0 + "px"; })
                .style("top", function(d) { return  (y(d.y + Math.max(0, d.dy )) - y(d.y) -  self.padding - TEXT_HEIGHT) + "px"; })
                .style("height", TEXT_HEIGHT + "px");
        }



        // sel.select(".nodeTextTitle")
        //     .style("width", function(d) { return  x(d.x + d.dx) - x(d.x) + "px"; });

        updateImg(originalSel);
    };

    self.nodePosition = position;
    return self;
}

