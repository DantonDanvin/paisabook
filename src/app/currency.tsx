import { ScrollView } from 'react-native';

import { Header, Row, Screen, goBack } from '@/components/ui';
import { CURRENCIES } from '@/lib/format';
import { put, useProfileData } from '@/lib/store';

// Changes the symbol shown for the current profile. Amounts are not converted.
export default function Currency() {
  const { profile } = useProfileData();
  return (
    <Screen>
      <Header back title="Currency" />
      <ScrollView>
        {CURRENCIES.map((c) => (
          <Row
            key={c.code}
            title={`${c.symbol.trim()} - ${c.name}`}
            value={profile?.currency === c.code ? 'Selected' : undefined}
            chevron={false}
            onPress={() => {
              if (profile) put('profiles', { ...profile, currency: c.code });
              goBack();
            }}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}
