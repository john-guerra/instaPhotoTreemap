var photos = [],
  maxID = null,
  pageCount = 0,
  MIN_PAGES = 10;

var fmt = d3.format(".2s");

function showTreemap(data) {
  var tree = {
    children: [
        // {
        //     id:1,
        //     name: "Hola",
        //     url: "https://farm8.staticflickr.com/7383/16406407515_d7bfccb1a5_q.jpg",
        //     img: () => "https://farm8.staticflickr.com/7383/16406407515_d7bfccb1a5_q.jpg",
        //     value: 229
        // }
    ]
  }

  tree.children  = data.map((d) => {
    return {
      id:d.node.id,
      label: d.node.edge_media_to_caption.edges.reduce((p,c) => (p+c.node.text) , ""),
      img: () => d.node.thumbnail_src,
      url: "http://www.instagram.com/p/" + d.node.shortcode,
      value: d.node.edge_liked_by.count,
      labelValue: fmt(d.node.edge_liked_by.count),
      node: d.node
    }
  })

  console.log(tree)
  treeMap.update(tree);

}

function refresh(user) {
  var query = "https://www.instagram.com/" + user + "?__a=1" + (maxID!==null ? "&max_id="+maxID : "");
  console.log("Pagecount=" + pageCount + " query = " + query);
  d3.json(query,
    (err, data) => {
    if (err) {
      alert("Couldn't find that user, try again");
      throw err;
    }
    console.log(data);
    if (!data.graphql.user.edge_owner_to_timeline_media.edges ||
      (data.graphql.user.edge_owner_to_timeline_media.edges.length===0&&photos.length===0)) {
      alert("This user is private or doesn't have photos");
      return;
    }
    treeMap.data = data;
    photos= photos.concat(data.graphql.user.edge_owner_to_timeline_media.edges);
    maxID = data.graphql.user.edge_owner_to_timeline_media.page_info.end_cursor;


    refreshTreemap();

    if (pageCount++<MIN_PAGES && maxID && user===d3.select("#txtUser").property("value")) {
      setTimeout(() => refresh(user), 1000);
    }
  });
}

function refreshTreemap() {
  utils.setGetParameter("user", treeMap.data.graphql.user.username);
  d3.select("#totalPhotos")
    .text(photos.length);
  d3.select("#user")
    .text("@" + treeMap.data.graphql.user.username);

  d3.select("#inTopN").property("max", photos.length+1);
  d3.select("#numTopPhotos")
    .text( d3.select("#chkBest").property("checked") ? "Top " + d3.select("#inTopN").property("value") : "Latest " + photos.length);
  d3.select("#maxDate")
    .text(new Date(photos[photos.length-1].date*1000));
  d3.select("#btnMore")
    .attr("disabled", !maxID ? "true": null );
  treeMap.showLabel(() => d3.select("#chkBest").property("checked"));
  console.log("topn= "+d3.select("#inTopN").property("value"));
  showTreemap( d3.select("#chkBest").property("checked") ?
    photos.sort((a,b) =>
      d3.descending(a.node.edge_liked_by.count, b.node.edge_liked_by.count))
        .slice(0,d3.select("#inTopN").property("value")):
    photos);
}


d3.select("#txtUser")
  .property("value", utils.getParameterByName("user") || "instagram")
  .on("keyup", () => {
    if (d3.event.keyCode === 13) {
      // photos = [];
      maxID = null;
      pageCount = 0;
      refresh(d3.select("#txtUser").property("value"));
    }
  });
d3.select("#btnSubmit")
  .on("click", () => {
    photos = [];
    maxID = null;
    pageCount = 0;
    refresh(d3.select("#txtUser").property("value").trim());
  });
d3.select("#btnMore")
  .on("click", () => {
    refresh(d3.select("#txtUser").property("value").trim());
  });
d3.select("#chkBest")
  .on("click", () => {
    refreshTreemap();
  });
d3.select("#inTopN")
  .on("input", () => { console.log("topN"); refreshTreemap(); })
  .on("focus", () => { console.log("topN"); refreshTreemap(); })
  .on("change", () => { console.log("topN"); refreshTreemap(); });



function onResize(event) {
    console.log("on Resize");

    // var treeMapHeight = $(window).height() - document.getElementById("mainContainer").offsetTop - 50;

    // treeMap.height = treeMapHeight;
    treeMap.updateWindowSizes();
    treeMap.update();
}
window.onresize = onResize;




refresh(utils.getParameterByName("user") || "instagram");

var treeMap = new TreeMap("#treemap");
treeMap.height = 600;
treeMap.growable = true;
treeMap.chainedAnimations = true;
treeMap = treeMap.labelValue("labelValue");

// if (type === "magic") {
//     treeMap.zoomable = true;
//     treeMap.padding = 5;
//     treeMap.chainedAnimations = false;
//     treeMap.animationDuration = 0;
// }
treeMap.init();

