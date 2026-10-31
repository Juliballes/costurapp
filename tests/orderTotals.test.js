import { test } from 'node:test';
import assert from 'node:assert/strict';
import { subtotalPrenda, totalPrendas, totalPedido, resumenPago } from '../src/lib/orderTotals.js';
import { mensajeRetiro } from '../src/lib/whatsapp.js';

test('tres prendas multiplican el precio unitario y suman otros trabajos', () => {
    const prendas = [{ cantidad: 3, precio: '1500' }, { cantidad: 2, precio: '750.50' }];
    assert.equal(subtotalPrenda(prendas[0]), 4500);
    assert.equal(totalPrendas(prendas), 6001);
});

test('los centavos no acumulan errores de coma flotante', () => {
    assert.equal(totalPrendas([{ cantidad: 3, precio: '0.10' }, { cantidad: 1, precio: '0.20' }]), 0.5);
    assert.equal(resumenPago({ precio: 0.3, sena: 0.1 }).saldo, 0.2);
});

test('se usa el detalle multiplicado aunque el total guardado esté desactualizado', () => {
    assert.equal(totalPedido({ precio: 1000, pedido_prendas: [{ cantidad: 3, precio: 1000 }] }), 3000);
});

test('se conservan los importes de pedidos antiguos sin detalle', () => {
    assert.equal(totalPedido({ precio: '4200', pedido_prendas: [] }), 4200);
    assert.equal(totalPedido({ precio: '4200' }), 4200);
});

test('un trabajo sin cargo no recupera un total anterior', () => {
    assert.equal(totalPedido({ precio: 1000, pedido_prendas: [{ cantidad: 3, precio: '' }] }), 0);
    assert.equal(totalPrendas([]), 0);
});

test('la seña y el saldo siguen el total al cambiar cantidades de un pedido pagado', () => {
    const pedido = { pagado: true, sena: 1000, pedido_prendas: [{ precio: 1000, cantidad: 3 }] };
    assert.deepEqual(resumenPago(pedido), { total: 3000, sena: 3000, saldo: 0 });
    pedido.pedido_prendas[0].cantidad = 2;
    assert.deepEqual(resumenPago(pedido), { total: 2000, sena: 2000, saldo: 0 });
});

test('la seña parcial se descuenta del total y el saldo nunca es negativo', () => {
    assert.deepEqual(resumenPago({ precio: 4500, sena: '1000', pagado: false }), { total: 4500, sena: 1000, saldo: 3500 });
    assert.equal(resumenPago({ precio: 1000, sena: 1500 }).saldo, 0);
});

test('el mensaje de retiro usa el nombre y los saltos sin emojis', () => {
    assert.equal(mensajeRetiro('  Ana María  '), 'Hola Ana María, soy Mariana de Mhome\n\nTu prenda ya está lista para retirar.\n\n¡Muchas gracias!');
    assert.equal(mensajeRetiro('   '), mensajeRetiro());
    const texto = mensajeRetiro('Ana & Sol');
    assert.equal(new URL(`https://wa.me/5491112345678?text=${encodeURIComponent(texto)}`).searchParams.get('text'), texto);
});
