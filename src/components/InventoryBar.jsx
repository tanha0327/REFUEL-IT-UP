import React from 'react';
import './InventoryBar.css';

const FUELS = [
    { id: 'REGULAR', color: '#ffeb3b', label: 'REG' },
    { id: 'PREMIUM', color: '#f44336', label: 'PREM' },
    { id: 'DIESEL', color: '#2196f3', label: 'DSL' },
    { id: 'ELECTRIC', color: '#9c27b0', label: 'ELEC' }
];

export default function InventoryBar({ selected, onSelect }) {
    return (
        <div className="inventory-container">
            <div className="inventory-bar">
                {FUELS.map((fuel) => (
                    <div
                        key={fuel.id}
                        className={`slot ${selected === fuel.id ? 'selected' : ''}`}
                        onTouchStart={() => onSelect(fuel.id)} // Touch optimization
                        onClick={() => onSelect(fuel.id)}
                    >
                        <div className="slot-inner" style={{ backgroundColor: fuel.color }}></div>
                        <span className="slot-label">{fuel.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
