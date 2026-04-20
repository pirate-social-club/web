"use client";

import * as React from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/primitives/combobox";
import { COUNTRIES, findCountry, type Country } from "@/lib/countries";

export interface NationalityPickerProps {
  value: string | null;
  onChange: (code: string | null) => void;
}

export function NationalityPicker({
  value,
  onChange,
}: NationalityPickerProps) {
  const selectedCountry = React.useMemo(() => findCountry(value), [value]);

  return (
    <Combobox<Country>
      autoHighlight
      items={COUNTRIES}
      itemToStringLabel={(country) => `${country.name} (${country.code})`}
      itemToStringValue={(country) => country.code}
      onValueChange={(country) => onChange(country?.code ?? null)}
      value={selectedCountry ?? undefined}
    >
      <ComboboxInput
        className="h-12 rounded-[var(--radius-lg)]"
        placeholder="Search country"
      />
      <ComboboxContent>
        <ComboboxEmpty>No countries found.</ComboboxEmpty>
        <ComboboxList>
          {(country) => (
            <ComboboxItem key={country.code} value={country}>
              <p className="text-base font-semibold text-foreground">{country.name}</p>
              <p className="text-base text-muted-foreground">{country.code}</p>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
