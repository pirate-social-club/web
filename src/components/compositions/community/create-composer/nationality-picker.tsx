"use client";

import * as React from "react";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@/components/primitives/combobox";
import { COUNTRIES, findCountry, type Country } from "@/lib/countries";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { Type } from "@/components/primitives/type";

export interface NationalityMultiPickerProps {
  values: string[];
  onChange: (codes: string[]) => void;
}

export function NationalityMultiPicker({
  values,
  onChange,
}: NationalityMultiPickerProps) {
  const selectedCountries = React.useMemo(
    () => values.reduce<Country[]>((result, value) => {
      const country = findCountry(value);
      if (country != null) {
        result.push(country);
      }
      return result;
    }, []),
    [values],
  );
  const countryOptions = React.useMemo(
    () => COUNTRIES.map((country) => ({ ...country, identityCode: findCountry(country.code)?.identityCode ?? country.code })),
    [],
  );
  const { locale } = useUiLocale();
  const copy = React.useMemo(() => getLocaleMessages(locale, "routes"), [locale]);
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
              <Type as="p" variant="body-strong">{country.name}</Type>
              <p className="text-base text-muted-foreground">{country.code}</p>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
