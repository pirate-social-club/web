"use client";

import * as React from "react";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@/components/primitives/combobox";
import { COUNTRIES, findCountry, type Country } from "@/lib/countries";
import { useRouteMessages } from "@/app/authenticated-routes/route-core";
import { Type } from "@/components/primitives/type";

export interface NationalityPickerProps {
  value: string | null;
  onChange: (code: string | null) => void;
}

export function NationalityPicker({
  value,
  onChange,
}: NationalityPickerProps) {
  const selectedCountry = React.useMemo(() => findCountry(value), [value]);
  const { copy } = useRouteMessages();
  const cc = copy.createCommunity.composer;

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
        placeholder={cc.searchCountry}
      />
      <ComboboxContent>
        <ComboboxEmpty>{cc.noCountriesFound}</ComboboxEmpty>
        <ComboboxList className="py-0">
          {(country) => (
            <ComboboxItem key={country.code} value={country}>
              <Type as="p" variant="body-strong" className="">{country.name}</Type>
              <p className="text-base text-muted-foreground">{country.code}</p>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export interface NationalityMultiPickerProps {
  values: string[];
  onChange: (codes: string[]) => void;
}

export function NationalityMultiPicker({
  values,
  onChange,
}: NationalityMultiPickerProps) {
  const selectedCountries = React.useMemo(
    () => values.map((value) => findCountry(value)).filter((country): country is Country => country != null),
    [values],
  );
  const countryOptions = React.useMemo(
    () => COUNTRIES.map((country) => ({ ...country, identityCode: findCountry(country.code)?.identityCode ?? country.code })),
    [],
  );
  const { copy } = useRouteMessages();
  const cc = copy.createCommunity.composer;

  return (
    <Combobox<Country, true>
      multiple
      autoHighlight
      items={countryOptions}
      itemToStringLabel={(country) => `${country.name} (${country.code})`}
      itemToStringValue={(country) => country.code}
      onValueChange={(countries) => onChange(countries.map((country) => country.identityCode ?? country.code))}
      value={selectedCountries}
    >
      <ComboboxChips className="rounded-[var(--radius-lg)]">
        <ComboboxValue>
          {(countries) => (
            <>
              {countries.map((country: Country) => (
                <ComboboxChip key={country.code}>{country.name}</ComboboxChip>
              ))}
              <ComboboxChipsInput
                aria-label={cc.searchCountry}
                placeholder={selectedCountries.length > 0 ? cc.searchCountry : cc.allowedNationalityLabel}
              />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent>
        <ComboboxEmpty>{cc.noCountriesFound}</ComboboxEmpty>
        <ComboboxList className="py-0">
          {(country) => (
            <ComboboxItem key={country.code} value={country}>
              <Type as="p" variant="body-strong" className="">{country.name}</Type>
              <p className="text-base text-muted-foreground">{country.code}</p>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
