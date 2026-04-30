
import { BaseLayout } from '@/components/core/BaseLayout';
import { ProductHeader } from '@/features/products/components/ProductHeader';
import { Slot } from 'expo-router';

export default function RootLayout() {
    return (
        <BaseLayout head={<ProductHeader />}>
            <Slot />
        </BaseLayout>
    );
}
