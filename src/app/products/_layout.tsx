
import { ProductHeader } from '@/components/features/Products/ProductHeader';
import { Slot } from 'expo-router';

export default function RootLayout() {
    return (
        <>
            <ProductHeader />
            <Slot />
        </>
    );
}