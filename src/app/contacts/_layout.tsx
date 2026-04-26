import { BaseLayout } from '@/components/core/BaseLayout';
import { Slot } from 'expo-router';
import {ContactHeader} from '@/features/contacts/components/ContactHeader';

export default function RootLayout() {
    return (
        <BaseLayout head={<ContactHeader />}>
            <Slot />
        </BaseLayout>
    );
}
