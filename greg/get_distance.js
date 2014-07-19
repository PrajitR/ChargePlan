var distance_cache;

function getDistance(origin, destination) {
  var key = origin + ' :: ' + destination;
  if (distance_cache[key]) {
      return distance_cache[key]
  } else {
      return nil; // XXX
  }
}

function calculateDistance(origin, destination) {

  var key = origin + ' :: ' + destination;
  if (distance_cache[key]) {
      // in cache already, do not re-fetch
      return;
  }

  var service = new google.maps.DistanceMatrixService();
  service.getDistanceMatrix(
    {
      origins: [origin],
      destinations: [destination],
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.METRIC,
      avoidHighways: false,
      avoidTolls: false
    },
    distance_callback
  );
}

function distance_callback(response, status) {
  if (status != google.maps.DistanceMatrixStatus.OK) {
    alert('Error was: ' + status);
    return;
  }

  var origins = response.originAddresses;
  var destinations = response.destinationAddresses;

  for (var i = 0; i < origins.length; i++) { // should be just one
      var results = response.rows[i].elements;
      for (var j = 0; j < results.length; j++) { // should be just one
	  if (results[j].status != google.maps.DistanceMatrixStatus.OK) {
	      alert('Error was: ' + status);
	  } else {
	      var key = origins[i] + ' :: ' + destinations[j];
	      distance_cache[key] = {
		  origin: origins[i],
		  destination: destinations[j],
		  distance: results[j].distance.value
	      };
	  }
      }
  }
}
