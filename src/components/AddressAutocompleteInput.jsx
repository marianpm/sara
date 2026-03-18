import React, { useEffect, useMemo, useRef } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let mapsConfigured = false;

export default function AddressAutocompleteInput({
  label,
  value,
  placeholder = "Ingresá una dirección",
  onTextChange,
  onSelectAddress,
  showMap = true,
  lat = null,
  lng = null,
  disabled = false,
}) {
  const hostRef = useRef(null);
  const elementRef = useRef(null);

  const onTextChangeRef = useRef(onTextChange);
  const onSelectAddressRef = useRef(onSelectAddress);

  useEffect(() => {
    onTextChangeRef.current = onTextChange;
  }, [onTextChange]);

  useEffect(() => {
    onSelectAddressRef.current = onSelectAddress;
  }, [onSelectAddress]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!apiKey || !hostRef.current || disabled || elementRef.current) return;

      if (!mapsConfigured) {
        setOptions({
          key: apiKey,
          v: "weekly",
          language: "es",
          region: "AR",
        });
        mapsConfigured = true;
      }

      const { PlaceAutocompleteElement } = await importLibrary("places");

      if (cancelled || !hostRef.current || elementRef.current) return;

      const placeAutocomplete = new PlaceAutocompleteElement({
        placeholder,
        includedRegionCodes: ["ar"],
      });

      placeAutocomplete.className = "w-full";

      const handleInput = (event) => {
        onTextChangeRef.current?.(event.target.value || "");
      };

      const handleSelect = async (event) => {
        try {
          const place = event.placePrediction?.toPlace?.();
          if (!place) {
            onSelectAddressRef.current?.(null);
            return;
          }

          await place.fetchFields({
            fields: ["formattedAddress", "location"],
          });

          if (!place.formattedAddress || !place.location) {
            onSelectAddressRef.current?.(null);
            return;
          }

          onSelectAddressRef.current?.({
            formattedAddress: place.formattedAddress,
            lat: place.location.lat(),
            lng: place.location.lng(),
          });
        } catch (error) {
          console.error("Error obteniendo dirección seleccionada:", error);
          onSelectAddressRef.current?.(null);
        }
      };

      placeAutocomplete.addEventListener("input", handleInput);
      placeAutocomplete.addEventListener("gmp-select", handleSelect);

      hostRef.current.innerHTML = "";
      hostRef.current.appendChild(placeAutocomplete);
      elementRef.current = placeAutocomplete;

      if (value) {
        placeAutocomplete.value = value;
      }
    }

    init().catch((error) => {
      console.error("Error cargando Google Maps:", error);
    });

    return () => {
      cancelled = true;
    };
  }, [disabled, placeholder, value]);

  useEffect(() => {
    if (elementRef.current && elementRef.current.value !== (value || "")) {
      elementRef.current.value = value || "";
    }
  }, [value]);

  const mapSrc = useMemo(() => {
    if (!showMap || lat == null || lng == null || !apiKey) return null;

    const q = encodeURIComponent(value || `${lat},${lng}`);
    return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${q}&center=${lat},${lng}&zoom=17`;
  }, [showMap, lat, lng, value]);

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-slate-800">{label}</label>
      )}

      <div
        ref={hostRef}
        className="rounded-md border border-slate-300 bg-white px-2 py-1"
      />

      {mapSrc && (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <iframe
            title="Vista previa de la dirección"
            src={mapSrc}
            className="h-60 w-full"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            style={{ border: 0 }}
          />
        </div>
      )}
    </div>
  );
}