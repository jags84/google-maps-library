AlliHay = {}

AlliHay.map = function(map_selector,options){
  var self = this;
  this.selector = $(map_selector);
  this.map = null;
  this.marker = null;
  this.references = [];
  this.circle = null;
  this.search_box = null;
  if (this.selector.attr('geo_location')){
    this.initial_position = this.selector.attr('geo_location').split(';');
  }
  this.options = {
    mobile: false,
    dragable: true,
    circle: false,
    radio: 1,
    location_callback: null,
    search_box:""
  } 

  var build_option_fn = function(option){
    fn_name = "set_" + option;
    self[fn_name] =  function (value) {
      event_name = "on_" + option + "_change";
      this.options[option] = value;
      if(this[event_name]){
        this[event_name]();
      }
      return self.options;
    }
  }
  
  for(opt in this.options){
    build_option_fn(opt);
    if(this.selector.attr(opt)){
      opt_value = this.selector.attr(opt);
      call_value = opt_value
      if (opt_value === "false") { call_value = false; };
      if (opt_value === "true") { call_value = true; };
      this[fn_name](call_value);
    }
  }

  if (options){
    this.setOptions(options);
  }
  
  return this
}
// Fin del AlliHay.map

AlliHay.map.prototype.createMap = function() {
  var self = this;

  if (this.selector && this.selector.length){
    this.selector.html("");
    this.selector.gmap(this.getMapOptions()).bind('init',function(evt,map){
      self.map = map;
      self.createCurrentPositionMarker();
      self.createReferenceMarkers();
      if (self.references.length == 0){
        self.setMapBound();
      }

      if (self.options.circle){
        self.drawCircle()
      }
    })
  }
};

AlliHay.map.prototype.setOptions = function(options) {
  for (opt in options){
    if (this["set_"+opt]){
      this["set_"+opt](options[opt]);
    }
  }
};

AlliHay.map.prototype.getMapOptions = function() {
  var myOptions = {
      overviewMapControl: false,
      streetViewControl: false,
      mapTypeId: google.maps.MapTypeId.ROADMAP
  };
  if (this.initial_position){
    myOptions.center = new google.maps.LatLng(this.initial_position[0],this.initial_position[1])
  }

  if (this.options.mobile){
    myOptions.disableDefaultUI = true;
    var ua = navigator.userAgent;
    var checker = {
      iphone: ua.match(/(iPhone|iPod|iPad)/),
      blackberry: ua.match(/BlackBerry/),
      android: ua.match(/Android/)
    };
    if(!checker.iphone){
      myOptions.zoomControl= true;
      myOptions.zoomControlOptions = {
          style: google.maps.ZoomControlStyle.SMALL,
          position: google.maps.ControlPosition.LEFT_TOP
      }
    }
    if(!checker.iphone && !checker.android){
      myOptions.panControl = true;
      myOptions.panControlOptions = { position: google.maps.ControlPosition.RIGHT_TOP }
    }
  }
  return myOptions;
};

AlliHay.map.prototype.setCenter = function(location) {
  center = new google.maps.LatLng(location[0],location[1]);
  this.map.setCenter(center);
};

// MARKERS
AlliHay.map.prototype.createMarker = function(lat,lng,icon) {
  marker_options = {
    position: new google.maps.LatLng(lat,lng)
  }
  if(icon){
    marker_options.icon = icon;
  }
  new_marker = new google.maps.Marker(marker_options);
  new_marker.setMap(this.map);
  return new_marker

};
AlliHay.map.prototype.handleMarkerDrag = function() {
  this.drawCircle();
  this.map.setCenter(this.marker.getPosition());
  if (this.options.location_callback){
    this.options.location_callback(this.getLocation());
  } 
};

AlliHay.map.prototype.createCurrentPositionMarker = function(location) {
  if(!location){
    if (this.initial_position){
      location = this.initial_position
    }
  }
  if(location){
    var self = this;
    this.marker = this.createMarker(location[0],location[1]);
    if(this.options.dragable === "true" || this.options.dragable == true){
      this.marker.setDraggable(true);
      if (this.options.circle){
        google.maps.event.addListener(this.marker,'dragend', function(){
         self.handleMarkerDrag(); 
        });
      }
    }
    this.setCenter(location);
  }
};

AlliHay.map.prototype.createReferenceMarkers = function() {
  var self = this;
  if($(this.selector).attr('markers')){
    data = [];
    markers = $(this.selector).attr('markers').split('|');
    $.each(markers,function(index,value){
      data.push(value.split(','));
    })
    this.buildReferenceMarkers(data)
  }
};

AlliHay.map.prototype.buildReferenceMarkers = function(data) {
  var self = this;
  self.cleanReferenceMarkers();
  $.each(data,function(index,value){
    lat = value[0];
    lng = value[1];
    self.references.push(self.createMarker(lat,lng));
  })
  this.setMapBound();
};

AlliHay.map.prototype.cleanReferenceMarkers = function() {
  if(this.references.length > 0){
    $.each(this.references,function(index,value){
      value.setMap(null);
    });
    this.references = []
  }
};

AlliHay.map.prototype.updateReferenceMarkers = function(data) {
  var self = this;
  if(data){
    locations = [];
    $.each(data,function(index,value){
      locations.push([value.latitude,value.longitude]);
    });
    this.buildReferenceMarkers(locations)
  }
};

AlliHay.map.prototype.setMapBound = function() {
  var self = this;
  if(this.references.length > 0){
    bounds = new google.maps.LatLngBounds(this.marker.getPosition());
    $.each(this.references,function(index,value){
      bounds.extend(value.getPosition());
    });
    this.map.fitBounds(bounds);
  }
  else{
    if (this.circle){
      this.map.fitBounds(this.circle.getBounds());
    }else{
      this.map.setZoom(14);  
    }
    
  }
};

AlliHay.map.prototype.drawCircle = function(){
  var self = this;
  radius = this.options.radio * 1609.344;
  if (!this.circle){
    this.circle = new google.maps.Circle({
      center: this.marker.getPosition(),
      radius: radius,
      strokeColor: "#0000FF",
      strokeOpacity: 0.35,
      strokeWeight: 2,
      fillColor: "#0000FF",
      fillOpacity: 0.20,
      map: this.map
    });      
  }else{
    this.circle.setRadius(radius);
    this.circle.setCenter(this.marker.getPosition());
  }
  this.setMapBound();
};

AlliHay.map.prototype.getLocation = function() {
  if (this.marker){
    pos = this.marker.getPosition();
    return {lat: pos.Ya, lng: pos.Za};
  }
};

AlliHay.map.prototype.deocoder = function(address, _callback) {
  geocoder = new google.maps.Geocoder();
  geocoder.geocode( { 'address': address}, function(results, status) {
    if (status == google.maps.GeocoderStatus.OK) {
      _callback($.map( results, function( item ) {
        return {
          label: item.formatted_address,
          value: item.formatted_address,
          map: {
            description: item.formatted_address,
            lng: item.geometry.location.lng(),
            lat: item.geometry.location.lat(),
          }
        } 
      }));
    }
  });
};

// On Change
AlliHay.map.prototype.on_mobile_change = function() {
  if (this.options.mobile){
    this.set_dragable(false);
  }
};

AlliHay.map.prototype.on_radio_change = function() {
  if (this.circle){
    this.drawCircle();
  }
};

AlliHay.map.prototype.on_search_box_change = function() {
  var self = this;
  if(this.options.search_box != ""){
    this.search_box = $(this.options.search_box)
    this.search_box.autocomplete({
      minLength: 5,
      source : function(req, resp){self.deocoder(req.term, resp)},
      select: function( event, ui ) {
        console.debug(ui.item)
        if (ui && ui.item && ui.item.map && self.marker){
          pos = new google.maps.LatLng(ui.item.map.lat,ui.item.map.lng);
          self.marker.setPosition(pos);
          self.drawCircle();
        }
      }
    })
  }
};

var map = null;
$(document).ready(function(){

  map = new AlliHay.map("#map_container",{location_callback:function(loc){
    console.debug(loc)
  }});
  map.createMap();
  
})



  // deocoder: function(address, _callback){
  //   geocoder = new google.maps.Geocoder();
  //   geocoder.geocode( { 'address': address}, function(results, status) {
  //     if (status == google.maps.GeocoderStatus.OK) {
  //       _callback($.map( results, function( item ) {
  //             return {
  //               label: item.formatted_address,
  //               value: item.formatted_address,
  //               map: {
  //                 description: item.formatted_address,
  //                 lng: item.geometry.location.lng(),
  //                 lat: item.geometry.location.lat(),
  //               }
  //             } 
  //       }));
  //     } else {
  //       // alert("Geocode was not successful for the following reason: " + status);
  //     }
  //   });
  // },
// changeLocation: function(input){
//     $(input).autocomplete({
//       minLength: 5,
//       source : function(req, resp){AlliHay.MAP.deocoder(req.term, resp)},
//       select: function( event, ui ) {
//         AlliHay.MAP.replaceMarkers(ui.item.map);
//         $("#latitude").val(ui.item.map.lat);
//         $("#longitude").val(ui.item.map.lng);        
//       }
//     });
//   }

   // $("#location").live('keyup.autocomplete', function(e){
   //    e.preventDefault();
   //    var input = $(this);
   //    _self.changeLocation(input);
   //   });