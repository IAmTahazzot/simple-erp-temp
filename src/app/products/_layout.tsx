
import { BaseLayout } from '@/components/core/BaseLayout';
import { ProductHeader } from '@/components/features/Products/ProductHeader';
import { Slot } from 'expo-router';

export default function RootLayout() {
    return (
        <BaseLayout head={<ProductHeader />}>
            <Slot />
        </BaseLayout>
    );
}