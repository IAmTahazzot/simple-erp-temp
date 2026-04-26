import { BaseLayout } from '@/components/core/BaseLayout';
import { Slot } from 'expo-router';
import {OrdersHeader} from '@/features/orders/components/OrdersHeader';

export default function RootLayout() {
    return (
        <BaseLayout head={<OrdersHeader />}>
            <Slot />
        </BaseLayout>
    );
}
